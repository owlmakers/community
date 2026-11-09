// VIN 해석 — 순수 함수. 브라우저(window.VinLib)와 Node(require) 공용. 입력은 어디에도 전송·저장하지 않는다.
// 원칙: 공개된 규격(ISO 3779·49 CFR 565)과 널리 공개된 제조사 코드만 해석하고, 확신이 없으면 null(= 화면에서 «알 수 없음»).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VinLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TRANSLIT = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  };
  const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  // 연식 문자: A=2010 … Y=2030 (I·O·Q·U·Z·0 은 쓰지 않는다). 30년 주기라 1980년대 후보가 같이 있다.
  const YEAR_LETTERS = 'ABCDEFGHJKLMNPRSTVWXY';

  const REGIONS = [
    ['AH', '아프리카'], ['JR', '아시아'], ['SZ', '유럽'],
    ['15', '북미'], ['67', '오세아니아'], ['89', '남미'],
  ];
  // 국가는 첫 글자(또는 두 글자)만으로 확실한 것만 둔다. 나머지는 null.
  const COUNTRY_BY_FIRST = { 1: '미국', 4: '미국', 5: '미국', 2: '캐나다', 3: '멕시코', J: '일본', L: '중국', W: '독일' };

  const TESLA_WMI = { '5YJ': true, '7SA': true, '7G2': true, LRW: true, XP7: true };
  const TESLA_MODEL = { S: 'Model S', 3: 'Model 3', X: 'Model X', Y: 'Model Y', R: 'Roadster' };
  const TESLA_PLANT = {
    F: 'Fremont(미국 캘리포니아)',
    C: 'Shanghai(중국)',
    B: 'Berlin-Brandenburg(독일)',
    A: 'Austin(미국 텍사스)',
  };

  function normalize(input) {
    if (input === null || input === undefined) return '';
    return String(input).toUpperCase().replace(/[\s-]+/g, '');
  }

  function validateFormat(vin) {
    const errors = [];
    if (!vin) return { ok: false, errors: [{ code: 'EMPTY' }] };
    if (vin.length !== 17) errors.push({ code: 'LENGTH', length: vin.length });
    for (let i = 0; i < vin.length; i++) {
      const ch = vin[i];
      if (/[IOQ]/.test(ch)) errors.push({ code: 'BAD_CHAR', char: ch, index: i });
      else if (!/[A-Z0-9]/.test(ch)) errors.push({ code: 'NON_ALNUM', char: ch, index: i });
    }
    return { ok: errors.length === 0, errors };
  }

  function checkDigit(vin) {
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const ch = vin[i];
      const v = /\d/.test(ch) ? Number(ch) : TRANSLIT[ch];
      sum += v * WEIGHTS[i];
    }
    const r = sum % 11;
    const expected = r === 10 ? 'X' : String(r);
    return { expected, actual: vin[8], valid: expected === vin[8] };
  }

  // now 기준으로 «가장 최근 후보(내년 모델까지)» 를 고른다.
  function decodeYear(code, now) {
    const nowYear = (now || new Date()).getFullYear();
    let candidates = null;
    const li = YEAR_LETTERS.indexOf(code);
    if (code && li >= 0 && code.length === 1) candidates = [1980 + li, 2010 + li];
    else if (/^[1-9]$/.test(code || '')) candidates = [2000 + Number(code), 2030 + Number(code)];
    if (!candidates) return { code, year: null, candidates: [] };
    const ok = candidates.filter((y) => y <= nowYear + 1);
    return { code, year: ok.length ? ok[ok.length - 1] : null, candidates };
  }

  function decodeWmi(wmi) {
    const first = wmi[0];
    let region = null;
    for (const [range, name] of REGIONS) {
      if (first >= range[0] && first <= range[1]) region = name;
    }
    if (first === '0') region = '남미';
    const country = COUNTRY_BY_FIRST[first] || null;
    const manufacturer = TESLA_WMI[wmi] ? 'Tesla' : null;
    return { wmi, region, country: first === 'X' ? null : country, manufacturer };
  }

  function isTesla(vin) {
    return !!TESLA_WMI[vin.slice(0, 3)];
  }

  function decodeTeslaModel(vin) {
    if (!isTesla(vin)) return null;
    const c = vin[3];
    if (c === 'C' && vin.slice(0, 3) === '7G2') return 'Cybertruck';
    return TESLA_MODEL[c] || null;
  }

  function decodePlant(vin) {
    if (!isTesla(vin)) return null;
    const code = vin[10];
    return TESLA_PLANT[code] ? { code, name: TESLA_PLANT[code] } : null;
  }

  function decodeVin(input, opts) {
    const now = (opts && opts.now) || new Date();
    const vin = normalize(input);
    const fmt = validateFormat(vin);
    if (!fmt.ok) {
      return { ok: false, vin, verdict: 'format_error', errors: fmt.errors, wmi: null, year: null, checkDigit: null, tesla: null, serial: null, unknown: [] };
    }
    const wmi = decodeWmi(vin.slice(0, 3));
    const cd = checkDigit(vin);
    cd.required = '12345'.includes(vin[0]); // 북미 판매 차량은 체크 디지트가 의무다. 그 밖은 의무가 아니다.
    const year = decodeYear(vin[9], now);
    let tesla = null;
    if (wmi.manufacturer === 'Tesla') {
      tesla = { model: decodeTeslaModel(vin), plant: decodePlant(vin) };
    }
    const unknown = [];
    if (!wmi.manufacturer) unknown.push('manufacturer');
    if (!wmi.country) unknown.push('country');
    if (year.year === null) unknown.push('year');
    if (tesla && !tesla.model) unknown.push('model');
    if (tesla && !tesla.plant) unknown.push('plant');
    let verdict = 'ok';
    if (!cd.valid) verdict = cd.required ? 'check_mismatch_required' : 'check_mismatch_info';
    return { ok: true, vin, verdict, errors: [], wmi, year, checkDigit: cd, tesla, serial: vin.slice(11), unknown };
  }

  // V2L(차량 외부 전원 공급) 연식 기준 «추정». 10번째 자리 코드만 본다. 실제 가능 여부는 차 안 PCS 부품(PCS2) 이 정하며,
  // 한국 사양은 자료가 엇갈려 확정하지 않는다(owl_skills tesla/reference/vehicle-v2l.md §2).
  //  V(2027형)=하드웨어 탑재 보도 · T(2026형)=차마다 다름 · S 이하=미지원 추정 · W·X·Y=대상일 가능성(추정)
  function v2lEstimate(vin) {
    const code = vin && vin[9];
    if (code === 'V') return { level: 'likely', code };
    if (code === 'T') return { level: 'varies', code };
    if (code === 'W' || code === 'X' || code === 'Y') return { level: 'maybe', code };
    if (code && YEAR_LETTERS.indexOf(code) >= 0) return { level: 'unsupported', code };
    return { level: 'unknown', code };
  }

  return { normalize, validateFormat, checkDigit, decodeYear, decodeWmi, decodeTeslaModel, decodePlant, decodeVin, v2lEstimate };
});

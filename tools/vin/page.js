// VIN 확인 화면 동작. 입력값은 이 기기 안에서만 계산한다 — 서버 호출·브라우저 저장·로그·이벤트 인자에 쓰지 않는다.
(function () {
  var V = window.VinLib;
  var form = document.getElementById('vin-form'), input = document.getElementById('vin-input');
  var out = document.getElementById('vin-result'), rows = document.getElementById('vin-rows');
  var table = document.getElementById('vin-table'), errs = document.getElementById('vin-errors');
  var UNKNOWN = '알 수 없음';
  var ERR = {
    EMPTY: function () { return 'VIN 을 입력해 주세요.'; },
    LENGTH: function (e) { return '17자리여야 합니다. 지금 ' + e.length + '자리입니다(' + (e.length < 17 ? (17 - e.length) + '자리 부족' : (e.length - 17) + '자리 초과') + ').'; },
    BAD_CHAR: function (e) { return (e.index + 1) + '번째 글자 «' + e.char + '» 는 VIN 에 쓰지 않습니다(I·O·Q 금지). 숫자 1·0 또는 다른 글자를 확인하세요.'; },
    NON_ALNUM: function (e) { return (e.index + 1) + '번째 글자 «' + e.char + '» 는 영문·숫자가 아닙니다.'; }
  };
  var V2L = {
    likely: '2027년형 코드(V) — 하드웨어에 탑재된 것으로 보도됨. 연식 기준 추정이며 한국 사양은 자료가 엇갈립니다.',
    varies: '2026년형 코드(T) — 차마다 다름. 연식만으로 정할 수 없으니 아래 공식 확인 방법으로 확인하세요.',
    maybe: '2028년형 이후 코드 — 대상일 가능성이 있는 연식 기준 추정입니다.',
    unsupported: '2025년형 이하 코드 — 미지원으로 보이는 연식 기준 추정입니다.',
    unknown: ''
  };
  var VERDICT = {
    ok: '형식·체크 디지트 통과',
    check_mismatch_required: '체크 디지트 불일치 — 오타를 확인하세요',
    check_mismatch_info: '체크 디지트 불일치(이 지역은 의무 아님)'
  };

  function el(tag, text) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; }
  function row(label, value, code) {
    var tr = el('tr'), th = el('th', label), td = el('td', value || UNKNOWN);
    th.setAttribute('scope', 'row');
    if (value && code) td.appendChild(el('em', code));
    tr.appendChild(th); tr.appendChild(td); rows.appendChild(tr);
  }

  function render(r) {
    out.hidden = false; rows.textContent = ''; errs.textContent = '';
    if (!r.ok) {
      table.hidden = true; errs.hidden = false;
      r.errors.forEach(function (e) { errs.appendChild(el('li', (ERR[e.code] || ERR.EMPTY)(e))); });
      return;
    }
    table.hidden = false; errs.hidden = true;
    var cd = r.checkDigit, y = r.year;
    row('판정', VERDICT[r.verdict]);
    row('제조국', r.wmi.country || r.wmi.region, r.vin.slice(0, 3));
    row('제조사', r.wmi.manufacturer, r.vin.slice(0, 3));
    row('연식', y.year ? y.year + '년식 추정(후보 ' + y.candidates.join('·') + ')' : '', r.vin[9]);
    if (r.tesla) {
      row('모델', r.tesla.model, r.vin[3]);
      row('공장', r.tesla.plant && r.tesla.plant.name, r.vin[10]);
      row('V2L(연식 기준 추정)', V2L[V.v2lEstimate(r.vin).level], r.vin[9]);
    }
    row('체크 디지트', cd.valid ? '일치함' : '불일치 (계산값 «' + cd.expected + '»)', r.vin[8]);
  }

  form.addEventListener('submit', function (ev) { ev.preventDefault(); render(V.decodeVin(input.value)); });
  document.getElementById('vin-clear').addEventListener('click', function () { input.value = ''; out.hidden = true; input.focus(); });
})();

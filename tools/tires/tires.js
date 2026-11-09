// 타이어 가이드 판정 — 순수 함수. 브라우저(window.TireLib)와 Node 공용. 입력은 어디에도 전송하지 않는다.
// 기준 = 오너 판단(눈 올 때 운전하나 → 올웨더, 연 주행거리 → 노화 vs 마모). 소음은 주관이라 뺀다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TireLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const WEAR_LIFE_KM = [40000, 60000]; // 일반 평균 마모수명(어림)
  const SERVICE_YEARS = 6; // 제조사 권장 교체 연한(점검 5년·교체 6년·상한 10년)
  const MAX_KM = 300000;

  function parseKm(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Number(v.replace(/[,\s]/g, ''));
    return NaN;
  }

  function recommend(input) {
    if (!input || typeof input.snow !== 'boolean') return { error: 'SNOW_REQUIRED' };
    const km = parseKm(input.kmPerYear);
    if (!Number.isFinite(km) || km <= 0 || km > MAX_KM) return { error: 'KM_INVALID' };
    const wear = [Math.round(WEAR_LIFE_KM[0] / km), Math.round(WEAR_LIFE_KM[1] / km)];
    let tier;
    if (WEAR_LIFE_KM[0] / km > SERVICE_YEARS) tier = 'budget'; // 마모가 한참 늦다 → 노화가 먼저
    else if (WEAR_LIFE_KM[1] / km <= SERVICE_YEARS) tier = 'premium'; // 마모가 먼저
    else tier = 'borderline';
    return { type: input.snow ? 'allweather' : 'allseason', tier, wearYears: wear, serviceYears: SERVICE_YEARS };
  }

  // 구동 방식(사륜·후륜·전륜)과 타이어 — 오너 2026-10-27. 제품명·상표·거친 표현은 쓰지 않는다.
  const DRIVE_NOTE = {
    short: '사륜구동이어도 같은 기준입니다. 구동 방식은 출발·가속을 돕지만, 멈추고 도는 것(제동·코너링)은 타이어가 정합니다.',
    result: '사륜·후륜·전륜 모두 같은 기준 (제동·코너링은 타이어가 정함)',
    faq: '구동 방식은 바퀴에 힘을 나눠 주는 방법이라 출발과 눈길 언덕 등판에는 실제로 도움이 됩니다. 그래서 «사륜이라 눈길 언덕을 잘 올라갔다» 는 경험은 거짓이 아닙니다. 하지만 브레이크를 밟는 제동 때는 구동 방식과 상관없이 네 바퀴 모두 같은 방식으로 멈추고, 코너에서 버티는 힘도 노면에 닿은 타이어 고무의 접지력이 정합니다. 추운 날씨에는 3PMSF(눈꽃 산 마크) 인증을 받은 올웨더가 일반 올시즌보다 눈·빙판 접지에 유리하게 만들어져 있습니다. 올라갈 수 있었다는 것과 안전하게 멈출 수 있다는 것은 다른 이야기라서, «눈 올 때 운전하나» 하나만 기준으로 삼고 구동 방식으로 타이어 등급을 낮추지 않기를 권합니다. 사륜은 더 무거운 경우가 많아 같은 타이어에서 멈추는 데 더 힘이 들기도 합니다.'
  };

  return { recommend, DRIVE_NOTE };
});

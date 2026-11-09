// 타이어 가이드 화면 동작 — 입력값은 이 쪽 안에서만 계산하고 어디에도 보내거나 저장하지 않는다.
// 뒤로가기 = 주소 해시(#snow=yes&km=10000)로 직전 입력을 복원한다.
(function () {
  var T = window.TireLib;
  var form = document.getElementById('tire-form'), out = document.getElementById('tire-result');
  var rows = document.getElementById('tire-rows'), table = document.getElementById('tire-table');
  var errs = document.getElementById('tire-errors'), why = document.getElementById('tire-why');
  var kmEl = document.getElementById('km');
  var TYPE = { allweather: '올웨더(3PMSF 인증)', allseason: '사계절(올시즌)' };
  var TIER = {
    budget: ['저가', '적게 타서 마모수명보다 노화(고무 경화, 5~6년)가 먼저 옵니다. 마모에 강한 비싼 타이어는 남는 성능입니다.'],
    premium: ['프리미엄', '많이 타서 노화 한계 전에 마모수명을 다 씁니다. 마모가 진행돼도 성능 저하가 덜한 쪽이 유리합니다.'],
    borderline: ['경계 구간', '노화와 마모가 비슷한 시기에 옵니다. 겨울 성능이 얼마나 오래 가는지와 가격 차이를 직접 비교해 보세요.']
  };
  var ERR = { SNOW_REQUIRED: '눈 올 때 운전하는지 골라 주세요.', KM_INVALID: '연간 주행거리를 1~300,000 사이 숫자로 입력해 주세요.' };
  function el(tag, text, cls) { var n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; }
  function row(label, value, cls) {
    var tr = el('tr', undefined, cls), th = el('th', label);
    th.setAttribute('scope', 'row'); tr.appendChild(th); tr.appendChild(el('td', value)); rows.appendChild(tr);
  }
  var noteEl = document.getElementById('drive-note'), faqEl = document.getElementById('faq-awd-body');
  if (noteEl) noteEl.textContent = T.DRIVE_NOTE.short;
  if (faqEl) faqEl.textContent = T.DRIVE_NOTE.faq;

  function show(snow, km) {
    var r = T.recommend({ snow: snow, kmPerYear: km });
    out.hidden = false; rows.textContent = ''; errs.textContent = ''; why.textContent = '';
    if (r.error) {
      table.hidden = true; why.hidden = true; errs.hidden = false;
      errs.appendChild(el('li', ERR[r.error]));
      return;
    }
    table.hidden = false; why.hidden = false; errs.hidden = true;
    var tier = TIER[r.tier];
    row('추천', TYPE[r.type], 'verdict');
    row('가격대', tier[0], 'verdict');
    row('마모로 끝나는 햇수', '약 ' + r.wearYears[0] + '~' + r.wearYears[1] + '년');
    row('교체 권장', r.serviceYears + '년');
    row('구동 방식', T.DRIVE_NOTE.result);
    why.textContent = tier[1] + ' 마모수명 4만~6만km 가정의 어림값이며 전기차는 더 빨리 닳을 수 있습니다.';
  }

  function parseHash() {
    var m = {}; location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i > 0) m[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    });
    return m;
  }
  function restore() {
    var h = parseHash();
    if (h.snow !== 'yes' && h.snow !== 'no') { out.hidden = true; return; }
    var radio = form.querySelector('input[name=snow][value=' + h.snow + ']');
    if (radio) radio.checked = true;
    if (h.km) kmEl.value = h.km;
    show(h.snow === 'yes', Number(kmEl.value));
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pick = form.querySelector('input[name=snow]:checked');
    var km = Number(kmEl.value);
    if (pick) {
      var next = '#snow=' + pick.value + '&km=' + encodeURIComponent(kmEl.value);
      if (location.hash !== next) location.hash = next; // 새 기록 1건 — hashchange 가 결과를 그린다
      else show(pick.value === 'yes', km);
    } else show(undefined, km);
  });
  window.addEventListener('hashchange', restore);
  restore();
})();

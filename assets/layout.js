// GNB 열기/닫기(모바일), LNB 접이식(폰은 접고 PC·태블릿은 펼침). Esc 로 닫고 토글로 포커스 복귀. 소유: 작업자 1.
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('gnb');
  var mq = window.matchMedia('(max-width: 767px)');
  var lnb = document.querySelector('.lnb-d');
  function set(open) { if (!btn || !nav) return; btn.setAttribute('aria-expanded', String(open)); nav.setAttribute('data-open', String(open)); }
  function syncLnb() { if (lnb) lnb.open = !mq.matches; }
  syncLnb();
  if (mq.addEventListener) mq.addEventListener('change', syncLnb);
  if (!btn || !nav) return;
  btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !btn.contains(e.target)) set(false);
  });
})();

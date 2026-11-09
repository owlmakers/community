/* 방문·설문 측정 — 브라우저·Node 공용, 의존성 0. 측정이 켜진 빌드에서만 쪽에 실린다(꺼짐이면 이 파일 자체가 산출물에 없다).
   두 길: ① pulse(기본) — 운영자 서버(api.owlmakers.com)로 쿠키 없이 원본 이벤트를 보낸다. 익명 번호는 쿠키가 아니라 이 탭의 sessionStorage 무작위 값.
          ② GoatCounter — 이미 실린 count() 만 부른다(없으면 아무 일도 안 함).
   보내는 것: 쪽 경로(쿼리·해시 제외)·직전 경로·유입 사이트 도메인(쪽 주소·검색어 제외)·공유 채널 표시·화면 크기 구분·설문 진행 이벤트. 고른 답·입력값·IP·UA 는 보내지 않는다.
   이벤트 이름에 고른 답은 넣지 않는다 — 이름 계산은 quiz.js eventsFor·여기 quizIdFromPath 만. 예외는 던지지 않는다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.OwlTrack = factory(root);
})(typeof self !== 'undefined' ? self : this, function (win) {
  var NAME = /^[a-z0-9][a-z0-9.-]*$/;
  var SID_RE = /^[A-Za-z0-9-]{8,64}$/;
  var respectDNT = false;
  var cfg = null, queue = [], timer = null, sid = '', memSid = '';

  function dnt() {
    try {
      var n = win.navigator || {};
      return n.doNotTrack === '1' || n.doNotTrack === 'yes' || win.doNotTrack === '1';
    } catch (e) { return false; }
  }
  function blocked() { return respectDNT && dnt(); }

  // ── pulse 길 ──────────────────────────────────────────────────────────────
  // 서버(owl-api pulse.normalize) 규칙: sid 영숫자·- 8~64자 · type 소문자·_ · target 120자 · meta 500자.
  function newSid() {
    try {
      var a = new Uint8Array(16); win.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (e) { return String(Math.random()).slice(2, 14) + String(Date.now()); }
  }
  var mem = {};
  function sget(k) { try { var v = win.sessionStorage.getItem(k); return v === null ? (mem[k] === undefined ? null : mem[k]) : v; } catch (e) { return mem[k] === undefined ? null : mem[k]; } }
  function sset(k, v) { mem[k] = String(v); try { win.sessionStorage.setItem(k, String(v)); } catch (e) {} }
  // 이 탭의 익명 번호(쿠키 아님, 탭을 닫으면 사라진다). fresh = 이 탭에서 처음(= 새 방문 시작).
  function getSid() {
    var v = sget('owl-sid');
    if (v && SID_RE.test(v)) return { id: v, fresh: false };
    v = newSid(); sset('owl-sid', v); return { id: v, fresh: true };
  }
  function configure(c) {
    if (!c || typeof c.endpoint !== 'string' || !/^https:\/\//.test(c.endpoint) || typeof c.app !== 'string') return false;
    var nr = String(c.noResult || '').split(',').filter(function (x) { return /^[a-z0-9-]+$/.test(x); });
    cfg = { endpoint: c.endpoint, app: c.app, name: String(c.name || '').slice(0, 40), ver: /^[a-z0-9._-]{1,32}$/.test(c.ver || '') ? c.ver : 'web1', noResult: nr };
    sid = getSid().id;
    return true;
  }
  function flush() {
    if (timer) { try { clearTimeout(timer); } catch (e) {} timer = null; }
    if (!cfg || !queue.length) return;
    var evs = queue.splice(0, 100);
    var body = JSON.stringify({ app: cfg.app, ver: cfg.ver, sid: sid, lang: 'ko', name: cfg.name, ev: evs });
    try {
      var n = win.navigator;
      if (n && typeof n.sendBeacon === 'function' && n.sendBeacon(cfg.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch (e) {}
    try { win.fetch(cfg.endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body }).catch(function () {}); } catch (e) {}
  }
  // 세션 안 증가 번호(seq)를 meta 에 붙여 큐에 넣는다. 보내기는 400ms 모아서 한 번.
  function enqueue(type, target, meta) {
    if (!cfg || blocked()) return false;
    var seq = (parseInt(sget('owl-seq'), 10) || 0) + 1; sset('owl-seq', seq);
    var m = { seq: seq }; for (var k in (meta || {})) if (Object.prototype.hasOwnProperty.call(meta, k)) m[k] = meta[k];
    queue.push({ type: type, target: String(target).slice(0, 120), meta: m, ts: Date.now() });
    if (queue.length >= 20) flush();
    else if (!timer) { try { timer = setTimeout(flush, 400); } catch (e) { flush(); } }
    return true;
  }
  // 이벤트 이름(quiz.js·share.js·cta 가 부르는 점 표기) → pulse 한 줄. 고른 답은 어느 칸에도 없다.
  // 건강·육아처럼 결과 유형만으로 상태가 짐작되는 주제(cfg.noResult 접두)는 quiz_done 의 결과 유형을 보내지 않는다(완료 여부만).
  function toPulse(name) {
    var p = name.split('.'), k = p[0] + '.' + p[1];
    if (k === 'quiz.start' && p.length === 3) return ['quiz_start', p[2], null];
    if (k === 'quiz.restart' && p.length === 3) return ['quiz_restart', p[2], null];
    if (k === 'quiz.q' && p.length === 4 && /^\d{1,3}$/.test(p[3])) return ['quiz_q', p[2], { q: Number(p[3]) }];
    if (k === 'quiz.done' && p.length === 4) {
      var hide = cfg && cfg.noResult.some(function (t) { return p[2].indexOf(t + '-') === 0; });
      return ['quiz_done', p[2], hide ? null : { res: p[3] }];
    }
    if (p[0] === 'share' && p.length === 3) return ['share', p[2], { ch: p[1] }];
    if (p[0] === 'cta' && p.length === 3) return ['cta', p[2], { kind: p[1] }];
    return null;
  }

  // 이벤트 1건. 나쁜 이름(대문자·공백·앞 슬래시)은 버린다.
  function event(name, title) {
    try {
      if (typeof name !== 'string' || !NAME.test(name) || blocked()) return false;
      var ok = false, m = cfg && toPulse(name);
      if (m) ok = enqueue(m[0], m[1], m[2]);
      var gc = win.goatcounter;
      if (gc && typeof gc.count === 'function') { gc.count({ path: name, title: String(title || name), event: true }); ok = true; }
      return ok;
    } catch (e) { return false; }
  }

  // 쪽 열림 한 줄(pv). 유입 도메인은 세션 첫 쪽에만(호스트명만 — 쪽 주소·검색어 제외), utm_source 는 공유 채널 4종만, 화면 크기 구분.
  function pvMeta(entry) {
    var doc = win.document, loc = win.location || {}, m = {};
    var prev = sget('owl-prev'); if (prev) m.prev = prev;
    if (entry) {
      m.entry = 1;
      try { if (doc.referrer) { var h = new URL(doc.referrer).hostname.toLowerCase(); if (h && h !== String(loc.hostname || '').toLowerCase()) m.ref = h.slice(0, 60); } } catch (e) {}
      try { var u = new URLSearchParams(String(loc.search || '')).get('utm_source'); if (u && /^(native|copy|x|facebook)$/.test(u)) m.utm = u; } catch (e) {}
    }
    var w = Number(win.innerWidth) || 0;
    m.vw = w && w < 600 ? 's' : w && w < 1024 ? 'm' : 'l';
    return m;
  }
  // 사이트 기준 경로(홈 = /). 기준 경로는 이 스크립트 주소(<기준>/tools/track.js)에서 얻는다. 쿼리·해시는 버린다.
  function pagePath(sc) {
    var p = String((win.location && win.location.pathname) || '/'), base = '/';
    try { if (sc && sc.src) base = new URL('../', sc.src).pathname; } catch (e) {}
    var rel = p.indexOf(base) === 0 ? p.slice(base.length) : p.replace(/^\//, '');
    return ('/' + rel).slice(0, 120);
  }
  function pageview(sc) {
    if (!cfg) return;
    var f = getSid(); sid = f.id;
    var path = pagePath(sc);
    enqueue('pv', path, pvMeta(f.fresh || !sget('owl-prev')));
    sset('owl-prev', path);
  }

  // 쪽 경로 → 설문 id(<주제>-<메뉴>). 결과 쪽 <주제>/<메뉴>/result/<유형>/ 도 같은 설문. 모르면 ''.
  function quizIdFromPath(pathname) {
    var s = String(pathname || '').split(/[?#]/)[0].split('/').filter(Boolean);
    var i = s.lastIndexOf('result');
    var base = i >= 0 ? s.slice(0, i) : s;
    if (base.length < 2) return '';
    var id = (base[base.length - 2] + '-' + base[base.length - 1]).toLowerCase();
    return NAME.test(id) ? id : '';
  }

  // 공유 주소에 출처 표시(추가 쿼리) — 이미 ? 가 있어도 안전.
  function withSrc(url, kind) {
    var u = String(url || '');
    var q = 'utm_source=' + encodeURIComponent(kind) + '&utm_campaign=quiz-share';
    return u + (u.indexOf('?') >= 0 ? '&' : '?') + q;
  }

  function init() {
    var doc = win.document;
    if (!doc || !doc.addEventListener) return;
    var sc = doc.currentScript;
    if (sc && sc.getAttribute && sc.getAttribute('data-respect-dnt') === '1') respectDNT = true;
    if (sc && sc.getAttribute && sc.getAttribute('data-pulse-endpoint')) {
      configure({ endpoint: sc.getAttribute('data-pulse-endpoint'), app: sc.getAttribute('data-pulse-app'), name: sc.getAttribute('data-pulse-name'), ver: sc.getAttribute('data-pulse-ver'), noResult: sc.getAttribute('data-pulse-nores') });
      pageview(sc);
      win.addEventListener('pagehide', flush);
      doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') flush(); });
    }
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!t) return;
      var cls = t.getAttribute('class') || '', here = win.location.pathname, href = t.getAttribute('href') || '';
      var hp = href.split(/[?#]/)[0];
      var name = '';
      if (/(^|\s)result-retry(\s|$)/.test(cls)) name = 'cta.retry.' + quizIdFromPath(here);
      else if (/(^|\s)cta-go(\s|$)/.test(cls)) name = 'cta.home.' + quizIdFromPath(hp);
      else if (t.parentNode && /(^|\s)result-other(\s|$)/.test(t.parentNode.getAttribute('class') || '')) name = 'cta.other.' + quizIdFromPath(here);
      if (name && !/\.$/.test(name)) event(name, name);
    }, true);
    // DNT 를 따르는 설정이면 count.js 는 자동 방문 계수를 끄고(no_onload) 여기서 직접 센다.
    if (respectDNT && !dnt() && !cfg) {
      var go = function () { var gc = win.goatcounter; if (gc && typeof gc.count === 'function') { try { gc.count(); } catch (e) {} } };
      if (doc.readyState === 'complete') go(); else win.addEventListener('load', go);
    }
  }

  var api = { configure: configure, flush: flush, pageview: pageview, pvMeta: pvMeta, toPulse: toPulse, pagePath: pagePath, event: event, quizIdFromPath: quizIdFromPath, withSrc: withSrc, NAME: NAME };
  if (typeof document !== 'undefined' && win && win.document === document) init();
  return api;
});

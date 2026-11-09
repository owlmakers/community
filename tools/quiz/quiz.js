// 설문 화면 동작 — 브라우저·Node 공용. 상태는 주소 해시(#q1=a&q2=b)에만 둔다. 저장소·쿠키·전송 없음.
// 순수 함수(screen)가 해시 → 화면 HTML 을 만들고, mount() 가 그것을 붙이고 클릭을 해시 변경으로 바꾼다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../lib/quiz/engine.js'));
  else root.QuizUI = factory(root.QuizEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  function ico(name, cls) { return '<svg class="qz-ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#qz-i-' + name + '"/></svg>'; }
  function badge(type) { return '<span class="qz-badge" data-type="' + esc(type) + '" aria-hidden="true">' + ico(type) + '</span>'; }
  var ARROW = ico('go'), LEFT = ico('back');
  var START = '#go';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // 해시 → {kind:'start'|'question'|'result', state}. 잘못된 해시는 시작 카드.
  function route(quiz, hash) {
    var h = String(hash || '');
    var state = E.decode(quiz, h);
    if (state.order.length === 0) return { kind: h === START ? 'question' : 'start', state: state };
    return { kind: E.current(state).done ? 'result' : 'question', state: state };
  }

  function hashFor(state) { return state.order.length ? E.encode(state) : START; }

  // 시작 카드 첫 줄(hook)·타협 직면(tradeoffs)·만든 사람 관점(ownerView). 필드가 없으면 빈 문자열 — 서버 렌더와 결과 쪽이 이 함수를 함께 쓴다.
  function hookHtml(quiz) { return quiz && quiz.hook ? '<p class="qz-hook">' + esc(quiz.hook) + '</p>' : ''; }
  function tradeoffHtml(r) {
    var list = (r && r.tradeoffs || []).filter(function (t) { return t && t.text; });
    if (!list.length) return '';
    return '<section class="qz-tradeoff"><h3 class="qz-tradeoff-h">타협하면 잃는 것</h3><ul class="qz-tradeoff-list">' + list.map(function (t) {
      return '<li><span class="qz-tradeoff-need" data-need="' + esc(t.need) + '">' + esc(t.need) + '</span><span class="qz-tradeoff-text">' + esc(t.text) + '</span></li>';
    }).join('') + '</ul></section>';
  }
  function ownerHtml(r) {
    return r && r.ownerView ? '<aside class="qz-ownerview"><h3 class="qz-ownerview-h">만든 사람 관점 <small>정답이 아니라 하나의 관점입니다</small></h3><p>' + esc(r.ownerView) + '</p></aside>' : '';
  }

  function startHtml(quiz, analytics) {
    var types = quiz.results.map(function (r) { return '<li class="qz-type-mini">' + badge(r.id) + esc(r.name) + '</li>'; }).join('');
    return '<section class="qz-card qz-start" data-screen="start">' +
      hookHtml(quiz) +
      '<span class="qz-tag">' + ico('user') + '만든 사람의 기준입니다</span>' +
      '<h2 class="qz-title" tabindex="-1">' + esc(quiz.title) + '</h2>' +
      '<p class="qz-intro">' + esc(quiz.intro) + '</p>' +
      '<ul class="qz-meta"><li>' + ico('list') + '질문 <strong>' + quiz.questions.length + '개</strong></li><li>' + ico('check') + (analytics === 'pulse' ? '고른 답은 보내거나 저장하지 않습니다(진행 단계와 결과 유형만 운영자 서버에 기록합니다)' : analytics ? '고른 답은 보내거나 저장하지 않습니다(결과 유형 집계만 합니다)' : '답은 보내거나 저장하지 않습니다') + '</li></ul>' +
      '<ul class="qz-types">' + types + '</ul>' +
      '<button type="button" class="qz-btn qz-btn-big qz-btn-cta" data-action="start">시작하기 ' + ARROW + '</button>' +
      '<p class="qz-basis">' + esc(quiz.basis) + '</p></section>';
  }

  function questionHtml(state) {
    var cur = E.current(state), q = cur.question, dots = '';
    for (var i = 1; i <= cur.total; i++) dots += '<li class="qz-dot' + (i < cur.n ? ' is-done' : i === cur.n ? ' is-current' : '') + '"></li>';
    var opts = q.options.map(function (o, i) {
      return '<li><button type="button" class="qz-opt" data-opt="' + esc(o.id) + '"><span class="qz-opt-n">' + (i + 1) + '</span><span>' + esc(o.label) + '</span>' + ico('go', 'qz-opt-go') + '</button></li>';
    }).join('');
    return '<section class="qz-card qz-question" data-screen="question" data-qid="' + esc(q.id) + '">' +
      '<div class="qz-head"><button type="button" class="qz-back" data-action="back" aria-label="이전 질문">' + LEFT + '이전</button>' +
      '<ul class="qz-dots" aria-hidden="true">' + dots + '</ul>' +
      '<p class="qz-count" role="progressbar" aria-label="진행" aria-valuemin="1" aria-valuemax="' + cur.total + '" aria-valuenow="' + cur.n + '" aria-valuetext="질문 ' + cur.n + ' / ' + cur.total + '">' + cur.n + '<span> / ' + cur.total + '</span></p></div>' +
      '<h2 class="qz-qtext" tabindex="-1">' + esc(q.text) + '</h2>' +
      '<ul class="qz-opts">' + opts + '</ul>' +
      '<p class="qz-why">' + ico('q') + '<span><b>왜 묻나요</b>' + esc(q.why) + '</span></p></section>';
  }

  function resultHtml(state, noteHref) {
    var r = E.result(state);
    var reasons = r.reasons.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return '<section class="qz-card qz-result" data-screen="result" data-result="' + esc(r.id) + '">' +
      '<div class="qz-top">' + badge(r.id) + '<div>' +
      '<span class="qz-kicker">' + esc(state.quiz.resultKicker || '당신은 이런 타입이 좋습니다') + '</span><h2 class="qz-verdict" tabindex="-1">' + esc(r.name) + '</h2>' +
      '<p class="qz-oneline">' + esc(r.tagline) + '</p></div></div>' +
      '<ol class="qz-reasons">' + reasons + '</ol>' +
      '<p class="qz-caution">' + ico('warn') + '<span><b>주의</b>' + esc(r.caution) + '</span></p>' +
      tradeoffHtml(r) + ownerHtml(r) +
      '<div class="qz-actions"><div class="qz-share" data-share></div>' +
      '<div class="qz-sub"><button type="button" class="qz-btn" data-action="restart">' + ico('redo') + '다시 하기</button>' +
      '<a class="qz-btn qz-btn-text" href="' + esc(noteHref) + '">' + esc(state.quiz.noteLabel || '자세한 기준 노트 보기') + ' ' + ARROW + '</a></div></div></section>';
  }

  // 순수 함수: (quiz, hash, opts) → {kind, state, html}
  function screen(quiz, hash, opts) {
    var r = route(quiz, hash);
    var html = r.kind === 'start' ? startHtml(quiz, opts && opts.analytics) : r.kind === 'question' ? questionHtml(r.state) : resultHtml(r.state, (opts && opts.noteHref) || '#');
    return { kind: r.kind, state: r.state, html: html };
  }

  // 클릭이 만들 다음 해시(순수). action: start|restart|back, 선택지면 {opt}
  function nextHash(quiz, hash, ev) {
    var state = route(quiz, hash).state;
    if (ev.action === 'start') return START;
    if (ev.action === 'restart') return '';
    if (ev.action === 'back') return hashFor(E.back(state));
    if (ev.opt) {
      var cur = E.current(state);
      if (cur.done) return hashFor(state);
      return E.encode(E.answer(state, cur.question.id, ev.opt));
    }
    return hashFor(state);
  }

  // 순수: 클릭 하나가 만드는 측정 이벤트 이름들. reached = 지금까지 도달한 최대 질문 번호(뒤로 갔다 다시 와도 중복으로 안 셈).
  // 이름에는 설문 id·질문 번호·결과 유형 id 만 — 고른 답은 넣지 않는다.
  function eventsFor(quiz, ev, next, reached) {
    var id = quiz.id, out = [];
    if (ev.action === 'restart') return ['quiz.restart.' + id];
    if (ev.action === 'start') out.push('quiz.start.' + id);
    if (next === '') return out;
    var r = route(quiz, next);
    if (r.kind === 'question') {
      var n = E.current(r.state).n;
      if (n > (reached || 0)) out.push('quiz.q.' + id + '.' + n);
    } else if (r.kind === 'result') {
      out.push('quiz.done.' + id + '.' + E.result(r.state).id);
    }
    return out;
  }
  // 순수: 클릭 뒤 최대 도달 질문 번호
  function reachedFor(quiz, ev, next, reached) {
    if (ev.action === 'restart') return 0;
    var r = route(quiz, next);
    if (r.kind !== 'question') return reached || 0;
    return Math.max(reached || 0, E.current(r.state).n);
  }

  function mount(el, data) {
    var quiz = data.quiz, drawn = false, reached = 0;
    function draw() {
      var hash = location.hash === '#' ? '' : location.hash;
      var s = screen(quiz, hash, { noteHref: data.noteHref, analytics: data.analytics });
      var prev = el.offsetHeight; if (prev > (el.__maxH || 0)) { el.__maxH = prev; el.style.minHeight = prev + 'px'; }
      el.innerHTML = s.html;
      el.setAttribute('data-kind', s.kind);
      if (s.kind === 'result' && window.OwlShare) {
        var res = E.result(s.state), rel = data.resultUrls && data.resultUrls[res.id];
        var cp = data.copy && data.copy[res.id];
        window.OwlShare.mount(el.querySelector('[data-share]'), {
          url: rel ? new URL(rel, location.href).href : location.href.split('#')[0],
          image: data.images && data.images[res.id], title: res.shareTitle, text: cp && cp.copy ? undefined : res.shareTitle, copy: cp, hashtags: cp && cp.hashtags, track: quiz.id
        });
      }
      if (drawn) { var hd = el.querySelector('h2[tabindex="-1"]'); if (hd) hd.focus(); }
      drawn = true;
    }
    el.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-action],[data-opt]') : null;
      if (!t || !el.contains(t)) return;
      var h = location.hash === '#' ? '' : location.hash;
      var next = nextHash(quiz, h, { action: t.getAttribute('data-action'), opt: t.getAttribute('data-opt') });
      if (next === h) return;
      var ev = { action: t.getAttribute('data-action'), opt: t.getAttribute('data-opt') };
      if (window.OwlTrack) {
        eventsFor(quiz, ev, next, reached).forEach(function (n) { window.OwlTrack.event(n, n); });
        reached = reachedFor(quiz, ev, next, reached);
      }
      location.hash = next;
    });
    window.addEventListener('hashchange', draw);
    draw();
  }

  function init() {
    var el = document.getElementById('quiz'), data = document.getElementById('quiz-data');
    if (!el || !data) return;
    mount(el, JSON.parse(data.textContent));
  }
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }

  return { hookHtml: hookHtml, tradeoffHtml: tradeoffHtml, ownerHtml: ownerHtml, route: route, screen: screen, nextHash: nextHash, eventsFor: eventsFor, reachedFor: reachedFor, hashFor: hashFor, esc: esc };
});

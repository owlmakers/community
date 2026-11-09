'use strict';
// 설문 엔진 — 브라우저·Node 공용. 저장소·네트워크를 쓰지 않는 순수 함수만 둔다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuizEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function start(quiz) {
    return { quiz: quiz, answers: {}, order: [] };
  }

  function findQ(quiz, qid) {
    return quiz.questions.find(function (q) { return q.id === qid; });
  }

  function clone(state) {
    return { quiz: state.quiz, answers: Object.assign({}, state.answers), order: state.order.slice() };
  }

  // 순서대로 다음 질문을 묻는다. 잘못된 질문·옵션 id 는 상태를 바꾸지 않는다.
  function answer(state, qid, oid) {
    var q = findQ(state.quiz, qid);
    if (!q || !q.options.some(function (o) { return o.id === oid; })) return state;
    var next = clone(state);
    if (!(qid in next.answers)) next.order.push(qid);
    next.answers[qid] = oid;
    return next;
  }

  function back(state) {
    if (!state.order.length) return state;
    var next = clone(state);
    var last = next.order.pop();
    delete next.answers[last];
    return next;
  }

  function current(state) {
    var qs = state.quiz.questions;
    var total = qs.length;
    for (var i = 0; i < total; i++) {
      if (!(qs[i].id in state.answers)) {
        return { done: false, question: qs[i], n: i + 1, total: total, selected: null };
      }
    }
    return { done: true, question: null, n: total, total: total };
  }

  function judge(quiz, answers) {
    for (var i = 0; i < quiz.rules.length; i++) {
      var when = quiz.rules[i].when;
      var ok = Object.keys(when).every(function (qid) {
        return when[qid].indexOf(answers[qid]) !== -1;
      });
      if (ok) return quiz.rules[i].result;
    }
    return quiz.fallback;
  }

  function result(state) {
    if (!current(state).done) return null;
    var id = judge(state.quiz, state.answers);
    return state.quiz.results.find(function (r) { return r.id === id; }) || null;
  }

  // 공유·새로고침용 해시: #q1=a&q2=b (질문 순서대로, 답한 것만)
  function encode(state) {
    return '#' + state.quiz.questions
      .filter(function (q) { return q.id in state.answers; })
      .map(function (q) { return q.id + '=' + state.answers[q.id]; })
      .join('&');
  }

  // 잘못된 해시(없는 질문·옵션·중복·앞 질문 건너뜀)는 통째로 무시하고 처음 상태를 돌려준다.
  function decode(quiz, hash) {
    var state = start(quiz);
    var h = String(hash || '').replace(/^#/, '');
    if (!h) return state;
    var parts = h.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      var q = quiz.questions[i];
      if (kv.length !== 2 || !q || kv[0] !== q.id) return start(quiz);
      var next = answer(state, kv[0], kv[1]);
      if (next === state) return start(quiz);
      state = next;
    }
    return state;
  }

  return { start: start, answer: answer, back: back, current: current, result: result, encode: encode, decode: decode, judge: judge };
});

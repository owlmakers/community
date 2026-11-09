/* 공유 모듈 — 브라우저 전용, 의존성 0. 저장소·쿠키·서버 전송 없음. API = SHARE-API.md */
(function () {
  'use strict';
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function currentUrl() {
    var l = window.location;
    if (l.origin && l.origin !== 'null') return l.origin + l.pathname;
    return String(l.href).split('#')[0].split('?')[0];
  }
  function fillUrl(s, url) { return String(s || '').split('{url}').join(url); }
  function stripUrl(s) { return String(s || '').split('{url}').join('').replace(/\s+$/, ''); }

  // 측정(OwlTrack)이 실린 빌드에서만: 공유 이벤트와 공유 주소의 출처 표시. 꺼짐이면 아래 둘 다 아무 일도 안 한다.
  function track(opts, kind) {
    var T = window.OwlTrack;
    if (!T) return;
    var id = opts.track || T.quizIdFromPath(window.location.pathname);
    if (id) T.event('share.' + kind + '.' + id, 'share.' + kind + '.' + id);
  }
  function src(url, kind) { return window.OwlTrack ? window.OwlTrack.withSrc(url, kind) : url; }

  function mount(box, opts) {
    opts = opts || {};
    var url = opts.url || currentUrl();
    var title = opts.title || document.title;
    var copy = opts.copy || {};
    var tags = opts.hashtags || {};
    var text = opts.text || stripUrl(copy.copy) || title;
    box.textContent = '';
    var row = el('div', 'share-row');

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      var nb = el('button', 'btn share-native', '공유하기');
      nb.type = 'button';
      nb.addEventListener('click', function () {
        track(opts, 'native');
        var p = navigator.share({ title: title, text: text, url: src(url, 'native') });
        if (p && p.catch) p.catch(function () {});
      });
      row.appendChild(nb);
    }

    // 이미지로 저장: 공유가 안 되는 환경에서도 항상 보이는 다운로드 링크(같은 출처 PNG + download 속성)
    if (opts.image && opts.image.href) {
      var ia = el('a', 'btn share-image', '이미지로 저장');
      ia.href = opts.image.href;
      ia.setAttribute('download', opts.image.name || 'result.png');
      ia.addEventListener('click', function () { track(opts, 'image'); });
      row.appendChild(ia);
    }

    var status = el('p', 'share-status');
    status.setAttribute('role', 'status');
    var field = el('input', 'share-field');
    field.type = 'text'; field.readOnly = true; field.value = url; field.hidden = true;
    field.setAttribute('aria-label', '공유 주소');
    var cb = el('button', 'btn share-copy', '링크 복사');
    cb.type = 'button';
    cb.addEventListener('click', function () {
      track(opts, 'copy');
      var curl = src(url, 'copy');
      function fallback() {
        field.value = curl;
        field.hidden = false; field.focus(); field.select();
        status.textContent = '주소를 선택했습니다. 길게 눌러 복사해 주세요.';
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fillUrl(copy.copy, curl) || curl).then(function () {
            status.textContent = '복사했습니다. 카카오톡 대화방에 붙여넣어 주세요.';
          }, fallback);
        } else { fallback(); }
      } catch (e) { fallback(); }
    });
    row.appendChild(cb);

    var xText = stripUrl(copy.x) || text;
    var xHref = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(xText) +
      '&url=' + encodeURIComponent(src(url, 'x')) +
      (tags.x && tags.x.length ? '&hashtags=' + encodeURIComponent(tags.x.join(',')) : '');
    var fbHref = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(src(url, 'facebook'));
    [['X', xHref, 'x'], ['페이스북', fbHref, 'facebook']].forEach(function (c) {
      var a = el('a', 'btn share-link', c[0]);
      a.addEventListener('click', function () { track(opts, c[2]); });
      a.href = c[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', c[0] + '로 공유 (새 창)');
      row.appendChild(a);
    });

    box.appendChild(row);
    box.appendChild(field);
    box.appendChild(el('p', 'share-kakao', '카카오톡: 「링크 복사」 후 대화방에 붙여넣어 주세요.'));
    box.appendChild(status);
  }

  function auto() {
    var nodes = document.querySelectorAll('[data-owl-share]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], c = {};
      try { c = JSON.parse(n.getAttribute('data-share-copy') || '{}'); } catch (e) { c = {}; }
      var ih = n.getAttribute('data-share-image');
      mount(n, { image: ih ? { href: ih, name: n.getAttribute('data-share-image-name') || '' } : null, url: n.getAttribute('data-share-url') || '', title: n.getAttribute('data-share-title') || '', track: n.getAttribute('data-share-track') || '', copy: c, hashtags: c.hashtags || {} });
    }
  }
  window.OwlShare = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();

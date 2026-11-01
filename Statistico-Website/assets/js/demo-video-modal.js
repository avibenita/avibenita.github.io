/**
 * On-demand player for an approved module demo.
 * The video file is not requested until the dialog opens.
 */
(function () {
  'use strict';

  var STYLE_ID = 'statistico-demo-video-style';
  var ROOT_ID = 'demoVideoBackdrop';
  var opener = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.demo-video-backdrop{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,12,18,.78);backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .2s ease}',
      '.demo-video-backdrop.is-open{opacity:1;pointer-events:auto}',
      '.demo-video-dialog{position:relative;width:min(1100px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;gap:12px;padding:16px 16px 18px;border-radius:18px;background:#0e141b;border:1px solid rgba(34,211,238,.28);box-shadow:0 28px 80px rgba(0,0,0,.45)}',
      '.demo-video-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-right:8px}',
      '.demo-video-title{margin:0;color:#f8fafc;font:600 1.05rem/1.3 "Segoe UI",Inter,system-ui,sans-serif}',
      '.demo-video-close{width:38px;height:38px;border-radius:12px;border:1px solid rgba(148,163,184,.35);background:transparent;color:#e2e8f0;cursor:pointer;font:600 1rem/1 inherit}',
      '.demo-video-close:hover{border-color:rgba(34,211,238,.7);color:#fff}',
      '.demo-video-close:focus-visible,.demo-video-link:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}',
      '.demo-video-frame{position:relative;background:#070b10;border-radius:12px;overflow:hidden}',
      '.demo-video-frame video{display:block;width:100%;height:auto;max-height:calc(100vh - 180px);background:#070b10}',
      '.demo-video-error{margin:0;color:#e2e8f0;font:500 .92rem/1.45 "Segoe UI",Inter,system-ui,sans-serif}',
      '.demo-video-error[hidden]{display:none}',
      '.demo-video-link{color:#22d3ee;font-weight:700}',
      '@media (max-width:640px){.demo-video-backdrop{padding:12px}.demo-video-dialog{padding:12px;border-radius:14px}.demo-video-title{font-size:.95rem}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureDialog() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="demo-video-backdrop" id="demoVideoBackdrop" role="dialog" aria-modal="true" aria-labelledby="demoVideoTitle" hidden>',
      '  <div class="demo-video-dialog">',
      '    <div class="demo-video-head">',
      '      <h2 class="demo-video-title" id="demoVideoTitle">Demo</h2>',
      '      <button type="button" class="demo-video-close" id="demoVideoClose">Close</button>',
      '    </div>',
      '    <div class="demo-video-frame">',
      '      <video id="demoVideo" controls playsinline preload="none"></video>',
      '    </div>',
      '    <p class="demo-video-error" id="demoVideoError" hidden>',
      '      This demo could not be played.',
      '      <a class="demo-video-link" id="demoVideoDirect" href="#">Open the video</a>',
      '    </p>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap.firstChild);
    return document.getElementById(ROOT_ID);
  }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll('button, a[href], video')).filter(function (el) {
      return !el.hidden && el.offsetParent !== null;
    });
  }

  function open(options) {
    ensureStyles();
    var backdrop = ensureDialog();
    var video = document.getElementById('demoVideo');
    var title = document.getElementById('demoVideoTitle');
    var error = document.getElementById('demoVideoError');
    var direct = document.getElementById('demoVideoDirect');
    var closeBtn = document.getElementById('demoVideoClose');
    opener = options.returnFocus || document.activeElement;
    title.textContent = options.title || 'Demo';
    error.hidden = true;
    direct.href = options.src;
    video.poster = options.poster || '';
    video.src = options.src;
    backdrop.hidden = false;
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    var backdrop = document.getElementById(ROOT_ID);
    var video = document.getElementById('demoVideo');
    if (!backdrop || backdrop.hidden) return;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    backdrop.classList.remove('is-open');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  function onKey(event) {
    var backdrop = document.getElementById(ROOT_ID);
    if (!backdrop || backdrop.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusables(backdrop);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function boot() {
    ensureStyles();
    var backdrop = ensureDialog();
    var video = document.getElementById('demoVideo');
    document.getElementById('demoVideoClose').addEventListener('click', close);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) close();
    });
    video.addEventListener('error', function () {
      document.getElementById('demoVideoError').hidden = false;
    });
    document.addEventListener('keydown', onKey);
  }

  window.StatisticoDemoVideo = { open: open, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

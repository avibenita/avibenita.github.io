/**
 * Guided-walkthrough player.
 * The branded preview is in the dialog immediately. The video file is
 * requested when the dialog opens, and playback starts as soon as it can.
 */
(function () {
  'use strict';

  var STYLE_ID = 'statistico-demo-video-style';
  var ROOT_ID = 'demoVideoBackdrop';
  var LOGO_SRC = '/Statistico-Website/assets/statistico-logo-dark-bg.svg';
  var opener = null;
  var session = 0;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.demo-video-backdrop{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;padding:28px 24px;background:rgba(6,10,16,.72);backdrop-filter:blur(10px);opacity:0;pointer-events:none}',
      '.demo-video-backdrop.is-open{opacity:1;pointer-events:auto}',
      '.demo-video-dialog{position:relative;width:min(920px,100%);max-height:calc(100vh - 40px);overflow:hidden;display:flex;flex-direction:column;gap:0;padding:28px 28px 24px;border-radius:20px;background:#0e1622;color:#f8fafc;font-family:Inter,"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;box-shadow:0 28px 70px rgba(0,0,0,.42);opacity:0;transform:scale(.985)}',
      '.demo-video-dialog>*{flex-shrink:0}',
      '.demo-video-backdrop,.demo-video-dialog,.demo-video-preview{transition:opacity 250ms ease,transform 250ms ease}',
      '.demo-video-backdrop.is-open .demo-video-dialog{opacity:1;transform:scale(1)}',
      '.demo-video-kicker{margin:0 48px 0 0;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,.68)}',
      '.demo-video-title{margin:8px 48px 0 0;font-size:1.7rem;font-weight:650;line-height:1.22;letter-spacing:-.02em;color:#f8fafc}',
      '.demo-video-lead{margin:10px 0 18px;max-width:40rem;font-size:1rem;font-weight:450;line-height:1.5;color:rgba(226,232,240,.82)}',
      '.demo-video-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border:0;border-radius:999px;background:transparent;color:rgba(226,232,240,.78);cursor:pointer;font:400 26px/1 Inter,"Segoe UI",sans-serif}',
      '.demo-video-close:hover{color:#fff;background:rgba(255,255,255,.06)}',
      '.demo-video-close:focus-visible,.demo-video-play:focus-visible,.demo-video-link:focus-visible{outline:2px solid #e4c16a;outline-offset:3px}',
      '.demo-video-frame{position:relative;width:min(100%,calc((100vh - 270px)*16/9));max-height:calc(100vh - 270px);margin-inline:auto;aspect-ratio:16/9;flex:none;border-radius:16px;overflow:hidden;background:#0c1422;box-shadow:0 22px 48px rgba(0,0,0,.36),0 0 0 1px rgba(228,193,106,.42)}',
      '.demo-video-frame video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#0c1422;opacity:0}',
      '.demo-video-frame video.is-ready{opacity:1}',
      '.demo-video-preview{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}',
      '.demo-video-preview.is-hidden{opacity:0;pointer-events:none}',
      '.demo-video-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
      '.demo-video-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,16,32,.62),rgba(8,16,32,.34) 42%,rgba(8,16,32,.58))}',
      '.demo-video-logo{position:relative;z-index:1;width:min(240px,58%);height:auto;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}',
      '.demo-video-play{position:relative;z-index:1;width:78px;height:78px;border:0;border-radius:50%;cursor:pointer;color:#1c1404;background:radial-gradient(circle at 35% 30%,#f8e7b0,#e4c16a 46%,#b8892e);box-shadow:0 12px 28px rgba(0,0,0,.35),0 0 0 8px rgba(228,193,106,.18);display:grid;place-items:center}',
      '.demo-video-play svg{width:26px;height:26px;margin-left:3px}',
      '.demo-video-play[hidden],.demo-video-preparing[hidden],.demo-video-error[hidden]{display:none}',
      '.demo-video-preparing{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px;margin:0;color:#f8fafc;font-size:.84rem;font-weight:600;letter-spacing:.01em;text-shadow:0 1px 8px rgba(0,0,0,.45)}',
      '.demo-video-progress{width:84px;height:3px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}',
      '.demo-video-progress span{display:block;width:42%;height:100%;border-radius:inherit;background:#e4c16a;animation:demo-video-progress 1s ease-in-out infinite}',
      '@keyframes demo-video-progress{0%{transform:translateX(-130%)}100%{transform:translateX(280%)}}',
      '.demo-video-error{margin:12px 0 0;color:#e2e8f0;font-size:.92rem;line-height:1.45}',
      '.demo-video-link{color:#e4c16a;font-weight:700}',
      '@media (prefers-reduced-motion:reduce){.demo-video-backdrop,.demo-video-dialog,.demo-video-preview,.demo-video-progress span{transition:none;animation:none}}',
      '@media (max-width:640px){.demo-video-backdrop{padding:12px}.demo-video-dialog{padding:22px 16px 16px;border-radius:16px}.demo-video-title{font-size:1.28rem}.demo-video-play{width:68px;height:68px}.demo-video-frame{width:min(100%,calc((100vh - 230px)*16/9));max-height:calc(100vh - 230px)}}'
    ].join('');
    document.head.appendChild(style);
  }

  function playIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5z"/></svg>';
  }

  function ensureDialog() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="demo-video-backdrop" id="demoVideoBackdrop" role="dialog" aria-modal="true" aria-labelledby="demoVideoTitle" hidden>',
      '  <div class="demo-video-dialog">',
      '    <button type="button" class="demo-video-close" id="demoVideoClose" aria-label="Close">\u00d7</button>',
      '    <p class="demo-video-kicker" id="demoVideoKicker"></p>',
      '    <h2 class="demo-video-title" id="demoVideoTitle"></h2>',
      '    <p class="demo-video-lead" id="demoVideoLead"></p>',
      '    <div class="demo-video-frame">',
      '      <video id="demoVideo" playsinline preload="auto"></video>',
      '      <div class="demo-video-preview" id="demoVideoPreview">',
      '        <img class="demo-video-shot" id="demoVideoShot" alt="">',
      '        <div class="demo-video-veil"></div>',
      '        <img class="demo-video-logo" src="' + LOGO_SRC + '" alt="Statistico Interactive">',
      '        <button type="button" class="demo-video-play" id="demoVideoPlay" aria-label="Play the guided walkthrough">' + playIcon() + '</button>',
      '        <p class="demo-video-preparing" id="demoVideoPreparing" hidden>',
      '          <span class="demo-video-progress" aria-hidden="true"><span></span></span>',
      '          Preparing your walkthrough\u2026',
      '        </p>',
      '      </div>',
      '    </div>',
      '    <p class="demo-video-error" id="demoVideoError" hidden>',
      '      This walkthrough could not be played.',
      '      <a class="demo-video-link" id="demoVideoDirect" href="#">Open the video</a>',
      '    </p>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap.firstChild);
    return document.getElementById(ROOT_ID);
  }

  function els() {
    return {
      backdrop: document.getElementById(ROOT_ID),
      video: document.getElementById('demoVideo'),
      preview: document.getElementById('demoVideoPreview'),
      shot: document.getElementById('demoVideoShot'),
      play: document.getElementById('demoVideoPlay'),
      preparing: document.getElementById('demoVideoPreparing'),
      error: document.getElementById('demoVideoError'),
      direct: document.getElementById('demoVideoDirect'),
      close: document.getElementById('demoVideoClose')
    };
  }

  function showCover(mode) {
    var ui = els();
    if (!ui.preview) return;
    ui.preview.classList.remove('is-hidden');
    ui.video.classList.remove('is-ready');
    ui.video.controls = false;
    ui.preparing.hidden = mode !== 'preparing';
    ui.play.hidden = mode === 'preparing';
  }

  function revealVideo() {
    var ui = els();
    if (!ui.video) return;
    ui.video.classList.add('is-ready');
    ui.video.controls = true;
    ui.preview.classList.add('is-hidden');
    ui.preparing.hidden = true;
  }

  function begin(token) {
    var ui = els();
    showCover('preparing');
    var pending = ui.video.play();
    if (!pending || !pending.then) return;
    pending.then(function () {
      if (token !== session) return;
    }).catch(function () {
      if (token !== session) return;
      showCover('play');
    });
  }

  function open(options) {
    ensureStyles();
    var backdrop = ensureDialog();
    var ui = els();
    var token = ++session;
    opener = options.returnFocus || document.activeElement;
    document.getElementById('demoVideoKicker').textContent = options.kicker || '';
    document.getElementById('demoVideoTitle').textContent = options.title || 'Guided walkthrough';
    document.getElementById('demoVideoLead').textContent = options.lead || '';
    ui.error.hidden = true;
    ui.direct.href = options.src;
    ui.shot.src = options.poster || '';
    ui.shot.hidden = !options.poster;
    showCover('preparing');
    ui.video.pause();
    ui.video.src = options.src;
    backdrop.hidden = false;
    backdrop.classList.remove('is-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('is-open');
      });
    });
    begin(token);
  }

  function close() {
    var ui = els();
    if (!ui.backdrop || ui.backdrop.hidden) return;
    session += 1;
    ui.video.pause();
    ui.video.removeAttribute('src');
    ui.video.load();
    ui.video.classList.remove('is-ready');
    ui.video.controls = false;
    ui.backdrop.classList.remove('is-open');
    ui.backdrop.hidden = true;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (opener && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }

  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll('button, a[href], video')).filter(function (el) {
      return !el.hidden && el.offsetParent !== null;
    });
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
    ensureDialog();
    var ui = els();
    ui.close.addEventListener('click', close);
    ui.play.addEventListener('click', function () { begin(session); });
    ui.backdrop.addEventListener('click', function (event) {
      if (event.target === ui.backdrop) close();
    });
    ui.video.addEventListener('playing', revealVideo);
    ui.video.addEventListener('error', function () {
      ui.error.hidden = false;
      showCover('play');
    });
    document.addEventListener('keydown', onKey);
  }

  window.StatisticoDemoVideo = { open: open, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/**
 * Framed workspace modal for Analytics module overview "Start Case Study" CTAs.
 * Opens the demo dialog in-page (same framed view as the Analytics hub) instead of a new tab.
 */
(function () {
  'use strict';

  var STYLE_ID = 'statistico-case-study-modal-style';
  var ROOT_ID = 'wsModalBackdrop';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ws-modal-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(215,220,228,.85);backdrop-filter:blur(14px);display:grid;place-items:center;opacity:0;pointer-events:none;transition:opacity .25s ease;overflow:hidden}',
      '.ws-modal-backdrop.open{opacity:1;pointer-events:all}',
      '.ws-modal{position:relative;width:min(96vw,1480px);height:calc(100vh - 96px);max-height:860px;padding:10px;box-sizing:border-box;background:#e8eaee;border:1px solid rgba(15,23,42,.08);border-radius:16px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.30),inset 0 1px 0 rgba(255,255,255,.7);display:flex;flex-direction:column;gap:12px;transform:translateY(18px) scale(.97);transition:transform .28s cubic-bezier(.22,.68,0,1.1)}',
      '.ws-modal-backdrop.open .ws-modal{transform:none}',
      '.ws-modal-title{display:none}',
      '.ws-modal-close{position:absolute;top:30px;right:34px;z-index:6;width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(7,14,24,.78);color:rgba(255,255,255,.72);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit;backdrop-filter:blur(8px)}',
      '.ws-modal-close:hover{background:rgba(255,80,60,.18);border-color:rgba(255,80,60,.4);color:#fff}',
      '.ws-modal-cta{position:static;align-self:center;flex-shrink:0;z-index:6;display:inline-flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;border-radius:999px;background:rgba(7,14,24,.88);border:1px solid rgba(120,200,255,.35);backdrop-filter:blur(8px);font-size:.82rem;color:rgba(255,255,255,.88);box-shadow:0 10px 26px rgba(0,0,0,.35);max-width:92%}',
      '.ws-modal-cta[hidden]{display:none}',
      '.ws-modal-cta a{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:999px;background:rgba(120,200,255,.18);border:1px solid rgba(120,200,255,.5);color:#e8f6ff;font-weight:800;font-size:.78rem;white-space:nowrap;text-decoration:none}',
      '.ws-modal .ws-device-frame{position:relative;width:100%;flex:1 1 auto;min-height:0;height:auto;padding:2px;box-sizing:border-box;border-radius:13px;background:#ccd2db;border:1px solid rgba(15,23,42,.10);box-shadow:0 10px 28px rgba(15,23,42,.16)}',
      '.ws-screen{position:relative;width:100%;height:100%;border-radius:11px;overflow:hidden;background:#1b2439;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}',
      '.ws-modal-frame{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;background:#1b2439}',
      '.ws-screen.ws-screen--scaled .ws-modal-frame{inset:auto;top:0;left:0;width:1280px;height:800px;max-width:none;transform-origin:top left;will-change:transform}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensureModal() {
    var existing = document.getElementById(ROOT_ID);
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="ws-modal-backdrop" id="wsModalBackdrop" role="dialog" aria-modal="true" aria-label="Workspace preview">',
      '  <div class="ws-modal">',
      '    <span class="ws-modal-title" id="wsModalTitle">Workspace Preview</span>',
      '    <button type="button" class="ws-modal-close" id="wsModalClose" title="Close">✕</button>',
      '    <div class="ws-device-frame" aria-label="Workspace demo frame">',
      '      <div class="ws-screen">',
      '        <iframe class="ws-modal-frame" id="wsModalFrame" title="Statistico workspace preview" allowfullscreen></iframe>',
      '      </div>',
      '    </div>',
      '    <div class="ws-modal-cta" id="wsModalCta">',
      '      <span>Want to analyze your own Excel workbook?</span>',
      '      <a href="/Statistico-Website/index-Addins.html">Get Statistico <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap.firstElementChild);
    return document.getElementById(ROOT_ID);
  }

  function moduleEmbedUrl(url) {
    try {
      var u = new URL(url, window.location.href);
      u.searchParams.set('embed', '1');
      u.searchParams.set('demo', '1');
      return u.href;
    } catch (e) {
      var joiner = url.indexOf('?') >= 0 ? '&' : '?';
      return url + joiner + 'embed=1&demo=1';
    }
  }

  function isCaseStudyLink(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    var href = anchor.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') return false;
    if (href.indexOf('/statistico-analytics/dialogs/views/') === -1) return false;
    var text = (anchor.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (text.indexOf('start case study') !== -1) return true;
    if (anchor.classList.contains('js-case-study')) return true;
    try {
      var u = new URL(href, window.location.href);
      return u.searchParams.get('embed') === '1' && u.searchParams.get('demo') === '1';
    } catch (e) {
      return /[?&]embed=1(?:&|$)/.test(href) && /[?&]demo=1(?:&|$)/.test(href);
    }
  }

  function boot() {
    ensureStyles();
    var backdrop = ensureModal();
    var modalFrame = document.getElementById('wsModalFrame');
    var modalTitle = document.getElementById('wsModalTitle');
    var modalClose = document.getElementById('wsModalClose');
    var modalCta = document.getElementById('wsModalCta');
    var modalScreen = modalFrame ? modalFrame.closest('.ws-screen') : null;
    var fitRetries = 0;

    function clearScale() {
      if (modalScreen) modalScreen.classList.remove('ws-screen--scaled');
      if (!modalFrame) return;
      modalFrame.style.transform = '';
      modalFrame.style.width = '';
      modalFrame.style.height = '';
    }

    function fitFrame() {
      if (!modalFrame || !modalScreen || !backdrop.classList.contains('open')) return;
      var sw = modalScreen.clientWidth || 0;
      var sh = modalScreen.clientHeight || 0;
      if (sw < 160 || sh < 120) {
        clearScale();
        if (fitRetries++ < 30) requestAnimationFrame(fitFrame);
        return;
      }
      fitRetries = 0;
      // Fill the visible frame. A virtual 1280×800 scale clips dialogs and
      // can collapse to a sliver if fit runs before flex layout has height.
      clearScale();
    }

    function openWorkspaceWindow(url, title) {
      var fullUrl = moduleEmbedUrl(url);
      if (modalTitle) modalTitle.textContent = title || 'Workspace Preview';
      if (modalCta) modalCta.hidden = false;
      modalFrame.src = '';
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
      fitFrame();
      modalFrame.onload = function () {
        fitFrame();
        // Keep product demos dark even when the marketing site is in light theme.
        try {
          modalFrame.contentWindow && modalFrame.contentWindow.postMessage(
            { type: 'THEME_CHANGE', theme: 'dark' },
            '*'
          );
        } catch (e) {}
      };
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          modalFrame.src = fullUrl;
          fitFrame();
        });
      });
    }

    function closeModal() {
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
      if (modalScreen) modalScreen.classList.remove('ws-screen--scaled');
      if (modalFrame) {
        modalFrame.style.transform = '';
        modalFrame.style.width = '';
        modalFrame.style.height = '';
        modalFrame.onload = null;
        setTimeout(function () { modalFrame.src = ''; }, 300);
      }
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
    });
    window.addEventListener('resize', fitFrame);

    document.addEventListener('click', function (e) {
      var anchor = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!isCaseStudyLink(anchor)) return;
      e.preventDefault();
      openWorkspaceWindow(anchor.getAttribute('href'), anchor.getAttribute('title') || 'Case Study');
    });

    // Progressive enhancement: stop forcing a new browser tab.
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="/statistico-analytics/dialogs/views/"]'), function (a) {
      if (!isCaseStudyLink(a)) return;
      a.removeAttribute('target');
      a.classList.add('js-case-study');
    });

    window.StatisticoCaseStudyModal = {
      open: openWorkspaceWindow,
      close: closeModal
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

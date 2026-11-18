/* Shared tooltip template for Statistico surfaces */
(function () {
  'use strict';

  if (window.StatisticoTooltip) return;

  const TOOLTIP_ID = 'statistico-shared-tooltip';
  const STYLE_ID = 'statistico-shared-tooltip-style';
  const SCRIPT_FLAG = 'data-st-tooltip-managed';
  let activeAnchor = null;
  let initialized = false;
  let moveCheckRaf = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .st-tooltip {
        position: fixed;
        z-index: 2147483000;
        max-width: 280px;
        min-width: 140px;
        padding: 10px 12px;
        border-radius: 10px;
        /* Light card. Dark-canvas rules (and OS dark color-scheme) were
           painting this layer the same color as the page, which left the
           slate text unreadable. !important keeps the fill light. */
        color-scheme: light !important;
        background: #f8fafc !important;
        background-color: #f8fafc !important;
        background-image: none !important;
        color: #1e293b !important;
        -webkit-text-fill-color: #1e293b !important;
        border: 1px solid rgba(15, 23, 42, .12) !important;
        font-size: 11.5px;
        font-weight: 400;
        line-height: 1.45;
        box-shadow:
          0 1px 2px rgba(15, 23, 42, .08),
          0 12px 32px rgba(15, 23, 42, .28),
          0 0 0 1px rgba(255,255,255,.7) inset !important;
        pointer-events: none;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity .14s ease, transform .14s ease;
        white-space: normal;
      }
      .st-tooltip[data-visible="1"] {
        opacity: 1;
        transform: translateY(0);
      }
      .st-tt-title {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #0f172a !important;
        -webkit-text-fill-color: #0f172a !important;
        margin-bottom: 4px;
        letter-spacing: .01em;
      }
      .st-tt-body {
        display: block;
        font-size: 11px;
        color: #475569 !important;
        -webkit-text-fill-color: #475569 !important;
        line-height: 1.5;
      }
      .st-tt-hint {
        display: block;
        margin-top: 5px;
        font-size: 10.5px;
        color: #64748b !important;
        -webkit-text-fill-color: #64748b !important;
        font-style: italic;
      }
      /* Suppress legacy CSS tooltips once managed by this script */
      [${SCRIPT_FLAG}="1"].info-balloon::after,
      [${SCRIPT_FLAG}="1"].info-balloon:hover::after,
      [${SCRIPT_FLAG}="1"].info-balloon:focus::after {
        content: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      [${SCRIPT_FLAG}="1"] .metric-tip,
      [${SCRIPT_FLAG}="1"]:hover .metric-tip {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      [${SCRIPT_FLAG}="1"].stat-info-tip--wrapped::after,
      [${SCRIPT_FLAG}="1"].stat-info-tip--wrapped:hover::after,
      [${SCRIPT_FLAG}="1"].stat-info-tip--wrapped:focus-visible::after {
        content: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
      }
      [${SCRIPT_FLAG}="1"].res-tooltip .res-tooltiptext,
      [${SCRIPT_FLAG}="1"].res-tooltip:hover .res-tooltiptext,
      [${SCRIPT_FLAG}="1"].tooltip-icon .tooltip-text,
      [${SCRIPT_FLAG}="1"].tooltip-icon:hover .tooltip-text,
      [${SCRIPT_FLAG}="1"].save-scenario-btn .tooltip-text,
      [${SCRIPT_FLAG}="1"].save-scenario-btn:hover .tooltip-text,
      [${SCRIPT_FLAG}="1"].tooltip .tooltiptext,
      [${SCRIPT_FLAG}="1"].tooltip:hover .tooltiptext,
      [${SCRIPT_FLAG}="1"].info-icon .tip,
      [${SCRIPT_FLAG}="1"].info-icon:hover .tip,
      [${SCRIPT_FLAG}="1"] .zone-tooltip,
      [${SCRIPT_FLAG}="1"]:hover .zone-tooltip {
        opacity: 0 !important;
        visibility: hidden !important;
        display: none !important;
        pointer-events: none !important;
      }
      [${SCRIPT_FLAG}="1"].info-dot::after,
      [${SCRIPT_FLAG}="1"].info-dot:hover::after,
      [${SCRIPT_FLAG}="1"].info-dot:focus::after,
      [${SCRIPT_FLAG}="1"].hero-action-btn::after,
      [${SCRIPT_FLAG}="1"].hero-action-btn:hover::after {
        content: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function paintTooltip(node) {
    if (!node || !node.style) return;
    const set = (prop, value) => node.style.setProperty(prop, value, 'important');
    set('color-scheme', 'light');
    set('background', '#f8fafc');
    set('background-color', '#f8fafc');
    set('background-image', 'none');
    set('color', '#1e293b');
    set('-webkit-text-fill-color', '#1e293b');
    set('border', '1px solid rgba(15, 23, 42, 0.12)');
    set('box-shadow', '0 1px 2px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.7)');
  }

  function ensureTooltipNode() {
    let node = document.getElementById(TOOLTIP_ID);
    if (!node) {
      if (!document.body) return null;
      node = document.createElement('div');
      node.id = TOOLTIP_ID;
      node.className = 'st-tooltip';
      node.setAttribute('role', 'tooltip');
      node.setAttribute('data-visible', '0');
      document.body.appendChild(node);
    }
    paintTooltip(node);
    return node;
  }

  function resolveText(el) {
    if (!el) return '';
    return (
      el.getAttribute('data-st-tip') ||
      el.getAttribute('data-tip') ||
      el.getAttribute('data-info') ||
      el.getAttribute('title') ||
      ''
    ).trim();
  }

  function resolveHtml(el) {
    if (!el) return '';
    return (el.getAttribute('data-st-tip-html') || '').trim();
  }

  function isTooltipNode(el) {
    return !!(el && (el.id === TOOLTIP_ID || (el.classList && el.classList.contains('st-tooltip'))));
  }

  function hasTipSource(el) {
    if (!el || el.nodeType !== 1 || isTooltipNode(el)) return false;
    return !!(
      el.getAttribute('data-st-tip') ||
      el.getAttribute('data-st-tip-html') ||
      el.getAttribute('data-tip') ||
      el.getAttribute('data-info') ||
      el.getAttribute('title')
    );
  }

  function prepareElement(el) {
    if (!el || isTooltipNode(el)) return;
    const text = resolveText(el);
    const html = resolveHtml(el);
    if (!text && !html) return;
    if (!el.getAttribute('data-st-tip') && text) el.setAttribute('data-st-tip', text);
    if (el.getAttribute('title')) {
      el.setAttribute('data-st-title-orig', el.getAttribute('title'));
      el.removeAttribute('title');
    }
    el.setAttribute(SCRIPT_FLAG, '1');
  }

  function prepareLegacyElements(root) {
    const scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('.info-balloon[data-info]').forEach((el) => {
      if (!el.getAttribute('data-st-tip')) {
        el.setAttribute('data-st-tip', (el.getAttribute('data-info') || '').trim());
      }
      prepareElement(el);
    });

    scope.querySelectorAll('.metric-help').forEach((el) => {
      if (el.getAttribute('data-st-tip') || el.getAttribute('data-st-tip-html')) return;
      const tip = el.querySelector('.metric-tip');
      if (tip && tip.textContent.trim()) {
        el.setAttribute('data-st-tip', tip.textContent.trim());
      }
      prepareElement(el);
    });

    scope.querySelectorAll('.res-tooltip, .tooltip-icon, .save-scenario-btn, .tooltip, .info-icon, .zone-info-btn').forEach((el) => {
      if (el.getAttribute('data-st-tip') || el.getAttribute('data-st-tip-html')) return;
      const tip = el.querySelector('.res-tooltiptext, .tooltip-text, .tooltiptext, .tip, .zone-tooltip');
      if (tip && tip.textContent.trim()) {
        el.setAttribute('data-st-tip', tip.textContent.trim());
      }
      prepareElement(el);
    });

    scope.querySelectorAll('[data-st-tip], [data-st-tip-html], [data-tip], [title]').forEach(prepareElement);
  }

  function positionTooltip(anchor, node) {
    const margin = 8;
    const rect = anchor.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = rect.bottom + margin;
    const leftCentered = rect.left + (rect.width / 2) - (nodeRect.width / 2);
    let left = Math.max(margin, Math.min(leftCentered, vw - nodeRect.width - margin));

    if (top + nodeRect.height > vh - margin) {
      top = rect.top - nodeRect.height - margin;
      if (top < margin) {
        top = Math.max(margin, vh - nodeRect.height - margin);
      }
    }

    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  function showFor(anchor) {
    if (!anchor) return;
    prepareElement(anchor);
    const html = resolveHtml(anchor);
    const text = resolveText(anchor);
    if (!html && !text) return;
    const node = ensureTooltipNode();
    if (html) {
      node.innerHTML = html;
    } else {
      node.textContent = text;
    }
    node.setAttribute('data-visible', '0');
    node.style.left = '-9999px';
    node.style.top = '-9999px';
    activeAnchor = anchor;
    requestAnimationFrame(() => {
      // A hide() may have run since this frame was scheduled (e.g. a modal
      // opened); showing anyway would strand a tooltip nothing can dismiss.
      if (activeAnchor !== anchor) return;
      positionTooltip(anchor, node);
      node.setAttribute('data-visible', '1');
    });
  }

  function hide() {
    const node = document.getElementById(TOOLTIP_ID);
    if (node) node.setAttribute('data-visible', '0');
    activeAnchor = null;
  }

  function closestTooltipAnchor(target) {
    let el = target && target.nodeType === 1 ? target : (target && target.parentElement);
    while (el && el !== document.documentElement) {
        if (hasTipSource(el) || el.getAttribute(SCRIPT_FLAG) === '1') {
        prepareElement(el);
        if (el.getAttribute(SCRIPT_FLAG) === '1') return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function isPointerOverAnchor(anchor, x, y) {
    if (!anchor) return false;
    const under = document.elementFromPoint(x, y);
    if (!under) return false;
    return anchor === under || anchor.contains(under);
  }

  function handlePointerOver(ev) {
    const anchor = closestTooltipAnchor(ev.target);
    if (!anchor) return;
    showFor(anchor);
  }

  function handlePointerOut(ev) {
    if (!activeAnchor) return;
    const anchor = closestTooltipAnchor(ev.target);
    if (!anchor) return;
    const to = ev.relatedTarget;
    if (to && anchor.contains(to)) return;
    if (activeAnchor !== anchor) return;
    if (typeof ev.clientX === 'number' && isPointerOverAnchor(anchor, ev.clientX, ev.clientY)) return;
    hide();
  }

  function handlePointerMove(ev) {
    if (!activeAnchor) {
      // Safety net: a visible tooltip with no active anchor is orphaned.
      const node = document.getElementById(TOOLTIP_ID);
      if (node && node.getAttribute('data-visible') === '1') hide();
      return;
    }
    if (moveCheckRaf) return;
    moveCheckRaf = requestAnimationFrame(() => {
      moveCheckRaf = null;
      if (!activeAnchor) return;
      if (!isPointerOverAnchor(activeAnchor, ev.clientX, ev.clientY)) {
        hide();
      }
    });
  }

  function handleFocusIn(ev) {
    const anchor = closestTooltipAnchor(ev.target);
    if (!anchor) return;
    if (ev.target.matches && ev.target.matches(':focus-visible')) {
      showFor(anchor);
    }
  }

  function handleFocusOut(ev) {
    const anchor = closestTooltipAnchor(ev.target);
    if (!anchor) return;
    if (activeAnchor === anchor) hide();
  }

  function init() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init, { once: true });
      return;
    }
    ensureStyle();
    ensureTooltipNode();
    prepareLegacyElements(document);

    if (initialized) return;
    initialized = true;

    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    // Clicking an anchor triggers its action (often a modal): retire the tooltip.
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('mousedown', hide, true);

    // Fallback for environments without reliable pointer events
    document.addEventListener('mouseover', handlePointerOver, true);
    document.addEventListener('mouseout', handlePointerOut, true);

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hide();
    });

    if (window.MutationObserver) {
      const observer = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (!node || node.nodeType !== 1 || isTooltipNode(node)) return;
            prepareLegacyElements(node);
            prepareElement(node);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function refresh(scope) {
    prepareLegacyElements(scope && scope.querySelectorAll ? scope : document);
  }

  window.StatisticoTooltip = { init, refresh, hide };
})();

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
        padding: 9px 11px;
        border-radius: 8px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid rgba(255,255,255,.16);
        font-size: 11.5px;
        font-weight: 400;
        line-height: 1.45;
        box-shadow: 0 8px 20px rgba(0,0,0,.28);
        pointer-events: none;
        opacity: 0;
        transform: translateY(2px);
        transition: opacity .12s ease, transform .12s ease;
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
        color: #ffffff;
        margin-bottom: 4px;
        letter-spacing: .01em;
      }
      .st-tt-body {
        display: block;
        font-size: 11px;
        color: rgba(248,250,252,0.78);
        line-height: 1.5;
      }
      .st-tt-hint {
        display: block;
        margin-top: 5px;
        font-size: 10.5px;
        color: rgba(248,250,252,0.48);
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
      [${SCRIPT_FLAG}="1"].res-tooltip:hover .res-tooltiptext {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTooltipNode() {
    let node = document.getElementById(TOOLTIP_ID);
    if (node) return node;
    if (!document.body) return null;
    node = document.createElement('div');
    node.id = TOOLTIP_ID;
    node.className = 'st-tooltip';
    node.setAttribute('role', 'tooltip');
    node.setAttribute('data-visible', '0');
    document.body.appendChild(node);
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

  function prepareElement(el) {
    if (!el) return;
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

    scope.querySelectorAll('.res-tooltip').forEach((el) => {
      if (el.getAttribute('data-st-tip') || el.getAttribute('data-st-tip-html')) return;
      const tip = el.querySelector('.res-tooltiptext');
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
    requestAnimationFrame(() => {
      positionTooltip(anchor, node);
      node.setAttribute('data-visible', '1');
    });
    activeAnchor = anchor;
  }

  function hide() {
    const node = document.getElementById(TOOLTIP_ID);
    if (node) node.setAttribute('data-visible', '0');
    activeAnchor = null;
  }

  function closestTooltipAnchor(target) {
    if (!target || !target.closest) return null;
    return target.closest(`[${SCRIPT_FLAG}="1"]`);
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
    if (activeAnchor === anchor) hide();
  }

  function handlePointerMove(ev) {
    if (!activeAnchor) return;
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
  }

  function refresh(scope) {
    prepareLegacyElements(scope && scope.querySelectorAll ? scope : document);
  }

  window.StatisticoTooltip = { init, refresh, hide };
})();

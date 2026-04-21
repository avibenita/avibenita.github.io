/* Shared tooltip template for Statistico surfaces */
(function () {
  'use strict';

  if (window.StatisticoTooltip) return;

  const TOOLTIP_ID = 'statistico-shared-tooltip';
  const STYLE_ID = 'statistico-shared-tooltip-style';
  const SCRIPT_FLAG = 'data-st-tooltip-managed';
  let activeAnchor = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .st-tooltip {
        position: fixed;
        z-index: 2147483000;
        max-width: 280px;
        min-width: 120px;
        padding: 8px 10px;
        border-radius: 8px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid rgba(255,255,255,.16);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.35;
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
    `;
    document.head.appendChild(style);
  }

  function ensureTooltipNode() {
    let node = document.getElementById(TOOLTIP_ID);
    if (node) return node;
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
      el.getAttribute('title') ||
      ''
    ).trim();
  }

  function prepareElement(el) {
    if (!el || el.getAttribute(SCRIPT_FLAG) === '1') return;
    const text = resolveText(el);
    if (!text) return;
    if (!el.getAttribute('data-st-tip')) el.setAttribute('data-st-tip', text);
    if (el.getAttribute('title')) {
      el.setAttribute('data-st-title-orig', el.getAttribute('title'));
      el.removeAttribute('title');
    }
    el.setAttribute(SCRIPT_FLAG, '1');
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
    const text = resolveText(anchor);
    if (!text) return;
    const node = ensureTooltipNode();
    node.textContent = text;
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
    return target.closest('[data-st-tip], [data-tip], [title]');
  }

  function init() {
    ensureStyle();
    ensureTooltipNode();

    document.querySelectorAll('[data-st-tip], [data-tip], [title]').forEach(prepareElement);

    document.addEventListener('mouseover', function (ev) {
      const anchor = closestTooltipAnchor(ev.target);
      if (!anchor) return;
      showFor(anchor);
    });

    document.addEventListener('mouseout', function (ev) {
      const anchor = closestTooltipAnchor(ev.target);
      if (!anchor) return;
      const to = ev.relatedTarget;
      if (to && anchor.contains(to)) return;
      if (activeAnchor === anchor) hide();
    });

    document.addEventListener('focusin', function (ev) {
      const anchor = closestTooltipAnchor(ev.target);
      if (!anchor) return;
      showFor(anchor);
    });

    document.addEventListener('focusout', function (ev) {
      const anchor = closestTooltipAnchor(ev.target);
      if (!anchor) return;
      if (activeAnchor === anchor) hide();
    });

    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hide();
    });
  }

  function refresh(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-st-tip], [data-tip], [title]').forEach(prepareElement);
  }

  window.StatisticoTooltip = { init, refresh, hide };
})();

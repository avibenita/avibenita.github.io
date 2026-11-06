export const HIGHLIGHT_SPEC = Object.freeze({
  color: '#D9B878',
  outlinePx: 1.5,
  offsetPx: 8,
  radiusPx: 4,
  fadeInMs: 200,
  fadeOutMs: 200
});

export const FILM_HIGHLIGHT_CSS = `
#filmHighlight {
  position: fixed;
  z-index: 100000;
  pointer-events: none;
  box-sizing: border-box;
  border: ${HIGHLIGHT_SPEC.outlinePx}px solid ${HIGHLIGHT_SPEC.color};
  border-radius: ${HIGHLIGHT_SPEC.radiusPx}px;
  background: transparent;
  opacity: 0;
  box-shadow: none;
}
#filmHighlight.is-in { animation: filmHighlightFadeIn ${HIGHLIGHT_SPEC.fadeInMs}ms ease forwards; }
#filmHighlight.is-out { animation: filmHighlightFadeOut ${HIGHLIGHT_SPEC.fadeOutMs}ms linear forwards; }
@keyframes filmHighlightFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes filmHighlightFadeOut { from { opacity: 1; } to { opacity: 0; } }
`;

export function highlightStandardIssues(spec = HIGHLIGHT_SPEC) {
  const issues = [];
  if (String(spec.color).toUpperCase() !== '#D9B878') issues.push(`highlight color ${spec.color}, expected #D9B878`);
  if (spec.outlinePx !== 1.5) issues.push(`highlight outline ${spec.outlinePx}px, expected 1.5px`);
  if (spec.offsetPx !== 8) issues.push(`highlight offset ${spec.offsetPx}px, expected 8px`);
  if (spec.radiusPx !== 4) issues.push(`highlight radius ${spec.radiusPx}px, expected 4px`);
  if (spec.fadeInMs !== 200) issues.push(`highlight fade-in ${spec.fadeInMs}ms, expected 200ms`);
  if (spec.fadeOutMs !== 200) issues.push(`highlight fade-out ${spec.fadeOutMs}ms, expected 200ms`);
  if (spec.breatheMs != null || spec.glow || spec.dim || spec.cornerLengthPx != null || spec.pulseMs != null) {
    issues.push('highlight still includes a glow, dim, bracket, or pulse');
  }
  return issues;
}

export function highlightCssIssues(css = FILM_HIGHLIGHT_CSS, spec = HIGHLIGHT_SPEC) {
  const issues = [];
  if (!css.includes(spec.color)) issues.push('highlight CSS is missing #D9B878');
  if (!css.includes(`${spec.outlinePx}px solid ${spec.color}`)) issues.push('highlight CSS is missing the 1.5px outline');
  if (!css.includes(`border-radius: ${spec.radiusPx}px`)) issues.push('highlight CSS is missing the 4px corner radius');
  if (!css.includes(`filmHighlightFadeIn ${spec.fadeInMs}ms`)) issues.push('highlight CSS is missing the 200ms fade-in');
  if (!css.includes(`filmHighlightFadeOut ${spec.fadeOutMs}ms`)) issues.push('highlight CSS is missing the 200ms fade-out');
  if (/film-bracket|film-glow|filmHighlightBreathe|filmBracketDraw|box-shadow:\s+(?!none\b)/.test(css)) {
    issues.push('highlight CSS still draws brackets, a glow, a shadow, or a dim');
  }
  if (/infinite|pulse/.test(css)) issues.push('highlight CSS still breathes or pulses');
  return issues;
}

export function highlightEventIssues(events, spec = HIGHLIGHT_SPEC) {
  const issues = [];
  for (const event of events || []) {
    if (event.action === 'clear') continue;
    const where = event.selector || event.scene || 'highlight';
    if (String(event.color || '').toUpperCase() !== spec.color) issues.push(`${where} color ${event.color}, expected ${spec.color}`);
    if (event.outlinePx != null && event.outlinePx !== spec.outlinePx) issues.push(`${where} outline ${event.outlinePx}px`);
    if (event.breatheMs != null) issues.push(`${where} still records a breathing glow`);
    if (!event.target || !event.frame) {
      issues.push(`${where} has no measured target and frame`);
      continue;
    }
    const pads = [
      event.target.x - event.frame.x,
      event.target.y - event.frame.y,
      (event.frame.x + event.frame.w) - (event.target.x + event.target.w),
      (event.frame.y + event.frame.h) - (event.target.y + event.target.h)
    ];
    for (const pad of pads) {
      if (Math.abs(pad - spec.offsetPx) > 1) issues.push(`${where} sits ${pad.toFixed(1)}px from the target, expected ${spec.offsetPx}px`);
    }
  }
  return issues;
}

export function highlightIssuesFromManifest(manifest, moduleConfig = {}) {
  const issues = [...highlightStandardIssues(), ...highlightCssIssues()];
  const events = manifest?.highlight?.events || manifest?.highlights || [];
  if (moduleConfig.highlightRequired && !events.some((event) => event.action !== 'clear')) {
    issues.push('highlight log is missing, so the warm-gold overlay was not recorded');
  }
  if (moduleConfig.highlightRequired) {
    for (const event of events) {
      if (!event || event.action === 'clear') continue;
      const where = event.selector || 'highlight';
      if (event.fadeInMs !== HIGHLIGHT_SPEC.fadeInMs) issues.push(`${where} fade-in ${event.fadeInMs}ms, expected ${HIGHLIGHT_SPEC.fadeInMs}ms`);
      if (event.fadeOutMs !== HIGHLIGHT_SPEC.fadeOutMs) issues.push(`${where} fade-out ${event.fadeOutMs}ms, expected ${HIGHLIGHT_SPEC.fadeOutMs}ms`);
      if (event.breatheMs != null) issues.push(`${where} still records a breathing glow`);
    }
  }
  issues.push(...highlightEventIssues(events));
  return issues;
}

export function highlightReport(scenes, starts = {}) {
  const events = [];
  for (const scene of scenes || []) {
    for (const event of scene.highlights || []) {
      const start = starts[scene.id];
      events.push({
        ...event,
        scene: scene.id,
        filmAt: start == null ? null : Number(start) + Number(event.at || 0)
      });
    }
  }
  return { spec: HIGHLIGHT_SPEC, events };
}

async function runHighlight(page, action, selector, zoom) {
  return page.evaluate(({ css, spec, action, selector, zoom }) => {
    function install() {
      if (!document.getElementById('filmHighlightCss')) {
        const style = document.createElement('style');
        style.id = 'filmHighlightCss';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      }
      window.__filmHighlightLog = window.__filmHighlightLog || [];
    }
    function ensure() {
      let el = document.getElementById('filmHighlight');
      if (!el) {
        el = document.createElement('div');
        el.id = 'filmHighlight';
        el.innerHTML = '';
        document.body.appendChild(el);
      }
      return el;
    }
    function place(el, target) {
      const pad = spec.offsetPx;
      const rect = target.getBoundingClientRect();
      const frame = {
        x: rect.x - pad,
        y: rect.y - pad,
        w: rect.width + pad * 2,
        h: rect.height + pad * 2
      };
      el.style.left = `${frame.x}px`;
      el.style.top = `${frame.y}px`;
      el.style.width = `${frame.w}px`;
      el.style.height = `${frame.h}px`;
      return { target: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, frame };
    }
    function track() {
      const el = document.getElementById('filmHighlight');
      const target = window.__filmHighlightTarget;
      if (!el || !target || !target.isConnected) return;
      place(el, target);
      window.__filmHighlightRaf = requestAnimationFrame(track);
    }
    install();
    if (action === 'clear') {
      const el = document.getElementById('filmHighlight');
      if (!el) return null;
      el.classList.remove('is-in');
      void el.offsetWidth;
      el.classList.add('is-out');
      window.__filmHighlightLog.push({ action: 'clear', wall: Date.now() });
      const node = window.__filmHighlightTarget;
      setTimeout(() => {
        if (window.__filmHighlightTarget === node) {
          window.__filmHighlightTarget = null;
          if (window.__filmHighlightRaf) cancelAnimationFrame(window.__filmHighlightRaf);
        }
      }, spec.fadeOutMs);
      return { action: 'clear' };
    }
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return null;
    const el = ensure();
    const placed = place(el, target);
    const measured = el.getBoundingClientRect();
    el.classList.remove('is-out', 'is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
    window.__filmHighlightTarget = target;
    if (window.__filmHighlightRaf) cancelAnimationFrame(window.__filmHighlightRaf);
    window.__filmHighlightRaf = requestAnimationFrame(track);
    const entry = {
      action: 'show',
      wall: Date.now(),
      selector,
      color: spec.color,
      outlinePx: spec.outlinePx,
      radiusPx: spec.radiusPx,
      offsetPx: spec.offsetPx,
      fadeInMs: spec.fadeInMs,
      fadeOutMs: spec.fadeOutMs,
      target: placed.target,
      frame: { x: measured.x, y: measured.y, w: measured.width, h: measured.height },
      nx: (placed.target.x + placed.target.w / 2) / window.innerWidth,
      ny: (placed.target.y + placed.target.h / 2) / window.innerHeight,
      zoom: zoom || 1.24
    };
    window.__filmHighlightLog.push(entry);
    return entry;
  }, { css: FILM_HIGHLIGHT_CSS, spec: HIGHLIGHT_SPEC, action, selector, zoom });
}

export async function showFilmHighlight(page, selector, options = {}) {
  const entry = await runHighlight(page, 'show', selector, options.zoom || 1.24);
  if (!entry) throw new Error(`Highlight target not found: ${selector}`);
  return entry;
}

export async function clearFilmHighlight(page) {
  await runHighlight(page, 'clear', null, null);
  await page.waitForTimeout(HIGHLIGHT_SPEC.fadeOutMs);
}

export function meanChannelDelta(before, after) {
  if (!before || !after || !before.length || before.length !== after.length) return null;
  let sum = 0;
  for (let i = 0; i < before.length; i += 1) sum += Math.abs(before[i] - after[i]);
  return sum / before.length;
}

export function outlinePulseIssue(before, after, maxDelta = 6) {
  const mean = meanChannelDelta(before, after);
  if (mean == null) return 'outline sample missing';
  if (mean > maxDelta) return `encoded outline changed by ${mean.toFixed(2)} per channel, above ${maxDelta}`;
  return '';
}

export async function readHighlightLog(page, usefulMs) {
  return page.evaluate((useful) => (window.__filmHighlightLog || []).map((event) => ({
    action: event.action,
    selector: event.selector || '',
    color: event.color || '',
    outlinePx: event.outlinePx ?? null,
    radiusPx: event.radiusPx ?? null,
    offsetPx: event.offsetPx ?? null,
    fadeInMs: event.fadeInMs ?? null,
    fadeOutMs: event.fadeOutMs ?? null,
    target: event.target || null,
    frame: event.frame || null,
    nx: event.nx ?? null,
    ny: event.ny ?? null,
    zoom: event.zoom ?? null,
    at: Math.max(0, (event.wall - useful) / 1000)
  })), usefulMs);
}

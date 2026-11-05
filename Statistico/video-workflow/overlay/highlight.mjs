export const HIGHLIGHT_SPEC = Object.freeze({
  color: '#FFD18A',
  outlinePx: 2,
  offsetPx: 10,
  cornerPx: 4,
  cornerLengthPx: 22,
  fadeInMs: 250,
  pulseMs: 1200,
  fadeOutMs: 200,
  dim: 'rgba(7, 17, 28, 0.22)',
  glow: 'rgba(255, 209, 138, 0.55)'
});

export const FILM_HIGHLIGHT_CSS = `
#filmHighlight {
  position: fixed;
  z-index: 100000;
  pointer-events: none;
  box-sizing: border-box;
  border: ${HIGHLIGHT_SPEC.outlinePx}px solid ${HIGHLIGHT_SPEC.color};
  border-radius: 2px;
  opacity: 0;
  box-shadow: 0 0 0 100vmax ${HIGHLIGHT_SPEC.dim}, 0 0 10px rgba(255, 209, 138, 0.32);
}
#filmHighlight .film-glow {
  position: absolute;
  inset: -6px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 0 16px 2px ${HIGHLIGHT_SPEC.glow};
}
#filmHighlight .film-bracket {
  position: absolute;
  width: ${HIGHLIGHT_SPEC.cornerLengthPx}px;
  height: ${HIGHLIGHT_SPEC.cornerLengthPx}px;
  border: 0 solid ${HIGHLIGHT_SPEC.color};
}
#filmHighlight .film-bracket.tl { top: -1px; left: -1px; border-top-width: ${HIGHLIGHT_SPEC.cornerPx}px; border-left-width: ${HIGHLIGHT_SPEC.cornerPx}px; }
#filmHighlight .film-bracket.tr { top: -1px; right: -1px; border-top-width: ${HIGHLIGHT_SPEC.cornerPx}px; border-right-width: ${HIGHLIGHT_SPEC.cornerPx}px; }
#filmHighlight .film-bracket.bl { bottom: -1px; left: -1px; border-bottom-width: ${HIGHLIGHT_SPEC.cornerPx}px; border-left-width: ${HIGHLIGHT_SPEC.cornerPx}px; }
#filmHighlight .film-bracket.br { bottom: -1px; right: -1px; border-bottom-width: ${HIGHLIGHT_SPEC.cornerPx}px; border-right-width: ${HIGHLIGHT_SPEC.cornerPx}px; }
#filmHighlight.is-in { animation: filmHighlightFadeIn ${HIGHLIGHT_SPEC.fadeInMs}ms linear forwards; }
#filmHighlight.is-in .film-glow { animation: filmHighlightPulse ${HIGHLIGHT_SPEC.pulseMs}ms ease-in-out ${HIGHLIGHT_SPEC.fadeInMs}ms 1 forwards; }
#filmHighlight.is-out { animation: filmHighlightFadeOut ${HIGHLIGHT_SPEC.fadeOutMs}ms linear forwards; }
@keyframes filmHighlightFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes filmHighlightFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes filmHighlightPulse {
  0% { opacity: 0.28; }
  42% { opacity: 1; }
  100% { opacity: 0.42; }
}
`;

export function highlightStandardIssues(spec = HIGHLIGHT_SPEC) {
  const issues = [];
  if (String(spec.color).toUpperCase() !== '#FFD18A') issues.push(`highlight color ${spec.color}, expected #FFD18A`);
  if (spec.outlinePx !== 2) issues.push(`highlight outline ${spec.outlinePx}px, expected 2px`);
  if (!(spec.offsetPx >= 8 && spec.offsetPx <= 12)) issues.push(`highlight offset ${spec.offsetPx}px is outside 8–12px`);
  if (!(spec.cornerPx > spec.outlinePx)) issues.push('highlight corners must be stronger than the 2px outline');
  if (spec.fadeInMs !== 250) issues.push(`highlight fade-in ${spec.fadeInMs}ms, expected 250ms`);
  if (spec.pulseMs !== 1200) issues.push(`highlight pulse ${spec.pulseMs}ms, expected 1200ms`);
  if (spec.fadeOutMs !== 200) issues.push(`highlight fade-out ${spec.fadeOutMs}ms, expected 200ms`);
  if (!spec.dim) issues.push('highlight dim is missing');
  return issues;
}

export function highlightCssIssues(css = FILM_HIGHLIGHT_CSS, spec = HIGHLIGHT_SPEC) {
  const issues = [];
  if (!css.includes(spec.color)) issues.push('highlight CSS is missing #FFD18A');
  if (!css.includes(`${spec.outlinePx}px solid ${spec.color}`)) issues.push('highlight CSS is missing the 2px outline');
  if (!css.includes(`border-top-width: ${spec.cornerPx}px`)) issues.push('highlight CSS is missing stronger corner brackets');
  if (!css.includes(`${spec.fadeInMs}ms`)) issues.push('highlight CSS is missing the 250ms fade-in');
  if (!css.includes(`${spec.pulseMs}ms`)) issues.push('highlight CSS is missing the 1.2s glow pulse');
  if (!css.includes(`${spec.fadeOutMs}ms`)) issues.push('highlight CSS is missing the 200ms fade-out');
  if (!css.includes(spec.dim)) issues.push('highlight CSS is missing the surrounding dim');
  if (!css.includes('100vmax')) issues.push('highlight CSS is missing the outer dim');
  return issues;
}

export function highlightEventIssues(events, spec = HIGHLIGHT_SPEC) {
  const issues = [];
  for (const event of events || []) {
    if (event.action === 'clear') continue;
    const where = event.selector || event.scene || 'highlight';
    if (String(event.color || '').toUpperCase() !== spec.color) issues.push(`${where} color ${event.color}, expected ${spec.color}`);
    if (event.outlinePx != null && event.outlinePx !== spec.outlinePx) issues.push(`${where} outline ${event.outlinePx}px`);
    if (event.cornerPx != null && !(event.cornerPx > spec.outlinePx)) issues.push(`${where} corners are not stronger than the outline`);
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
      if (pad < 8 - 1 || pad > 12 + 1) issues.push(`${where} sits ${pad.toFixed(1)}px from the target, outside 8–12px`);
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
        el.innerHTML = '<span class="film-glow"></span><span class="film-bracket tl"></span><span class="film-bracket tr"></span><span class="film-bracket bl"></span><span class="film-bracket br"></span>';
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
      cornerPx: spec.cornerPx,
      offsetPx: spec.offsetPx,
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

export async function readHighlightLog(page, usefulMs) {
  return page.evaluate((useful) => (window.__filmHighlightLog || []).map((event) => ({
    action: event.action,
    selector: event.selector || '',
    color: event.color || '',
    outlinePx: event.outlinePx ?? null,
    cornerPx: event.cornerPx ?? null,
    offsetPx: event.offsetPx ?? null,
    target: event.target || null,
    frame: event.frame || null,
    nx: event.nx ?? null,
    ny: event.ny ?? null,
    zoom: event.zoom ?? null,
    at: Math.max(0, (event.wall - useful) / 1000)
  })), usefulMs);
}

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { clearFilmHighlight, readHighlightLog, showFilmHighlight, showFilmHighlights } from '../../video-workflow/overlay/highlight.mjs';

const require = createRequire('e:/OneDrive/GitHub/statistico-analytics/package.json');
const { chromium } = require('playwright');

const ROOT = 'e:/OneDrive/GitHub';
const PRODUCE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(ROOT, 'Statistico/regression/04_review/work');
const AUDIO = path.join(ROOT, 'Statistico/regression/03_audio');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const PORT = 8775;
const BASE = `http://127.0.0.1:${PORT}`;
const PROBE = process.argv.includes('probe');

fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(path.join(WORK, 'qa'), { recursive: true });

function loudnormMeasured(file) {
  const r = spawnSync(FFMPEG, ['-i', file, '-af', 'loudnorm=I=-16.6:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`loudnorm measure failed\n${text.slice(-1500)}`);
  return JSON.parse(text.slice(start, end + 1));
}

function leveledVoice(mp3, dest) {
  const measured = loudnormMeasured(mp3);
  const wav = dest || path.join(WORK, 'scenario-1-level.wav');
  const leveled = spawnSync(FFMPEG, [
    '-y', '-i', mp3,
    '-af', `loudnorm=I=-16.6:TP=-1.5:LRA=11:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
    wav
  ], { encoding: 'utf8' });
  if (leveled.status !== 0) throw new Error((leveled.stderr || 'loudnorm failed').slice(-800));
  return wav;
}

function mediaDuration(file) {
  const r = spawnSync(FFMPEG, ['-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(`${r.stdout || ''}\n${r.stderr || ''}`);
  if (!m) throw new Error(`No duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const dur = (id) => (PROBE ? 0.35 : mediaDuration(path.join(AUDIO, `${id}.mp3`)));

function serve() {
  return http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(path.resolve(ROOT))) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(WORK, 'qa', `${name}.png`) });
}

async function hot(page, selector, zoom = 1.22) {
  if (!selector) {
    await clearFilmHighlight(page);
    return;
  }
  await showFilmHighlight(page, selector, { zoom, tone: 'glow' });
  await page.waitForTimeout(PROBE ? 40 : 320);
}

async function loadFilm(page) {
  await page.goto(`${BASE}/statistico-analytics/dialogs/views/regression/regression-coefficients.html?demo=1&embed=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForFunction(() => {
    const el = document.getElementById('kpiRSquared');
    const overlay = document.getElementById('loadingOverlay');
    return el && /65\.63%/.test(el.textContent || '') && overlay && overlay.classList.contains('hidden');
  }, null, { timeout: 25000 });
  await page.waitForTimeout(PROBE ? 80 : 350);
}

async function overview(page, { mark, say }) {
  await page.goto(`${BASE}/Statistico/regression/produce/overview.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.body.classList.add('go'));
  mark();
  await page.waitForTimeout(PROBE ? 40 : 280);
  await say('overview-1');
  await page.waitForTimeout(PROBE ? 40 : 2200);
}

async function effects(page, { mark, note }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('viz-partial'));
  await page.waitForFunction(() => {
    const row = document.getElementById('modelVizCbRow');
    const chart = document.querySelector('#modelVizChart .highcharts-container, #modelVizChart svg');
    return row && row.textContent && /Store Size/.test(row.textContent) && chart;
  }, null, { timeout: 12000 });
  await page.waitForTimeout(PROBE ? 40 : 400);
  const before = await page.locator('#modelVizFitRow').innerText();
  await page.evaluate(() => {
    const scroller = document.querySelector('#tab-model-viz .ws-body');
    const pill = document.getElementById('modelVizCbRow');
    if (!scroller || !pill) return;
    const top = pill.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - 8);
  });
  const store = page.locator('#modelVizCbRow button', { hasText: 'Store Size' });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('#modelVizCbRow button')].find((el) => /Store Size/.test(el.textContent || ''));
    if (button) button.id = 'filmStorePill';
  });
  await hot(page, '#filmStorePill', 1);
  note('effects-1');
  const total = dur('effects-1');
  await page.waitForTimeout(total * 0.58 * 1000);
  await store.click();
  await page.waitForFunction(() => /Store Size/.test(document.getElementById('modelVizFitRow')?.innerText || ''), null, { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 40 : 500);
  const after = await page.locator('#modelVizFitRow').innerText();
  if (before === after) throw new Error('Choosing Store Size did not change the effect plot');
  await clearFilmHighlight(page);
  await page.evaluate(() => {
    document.getElementById('modelVizChart')?.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await hot(page, '#modelVizChart', 1);
  await page.waitForTimeout(Math.max(0, total * 0.42) * 1000);
  await page.waitForTimeout(PROBE ? 40 : 3000);
  await clearFilmHighlight(page);
}

async function tagStoreSize(page) {
  const tagged = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#dataTableBody tr')].find((tr) => /Store Size/.test(tr.textContent || ''));
    if (!row) return false;
    row.id = 'filmStoreSizeRow';
    const box = row.querySelector('.coef-include-check');
    const label = row.querySelector('.coef-var-cell');
    if (!box || !label) return false;
    box.id = 'filmStoreSizeCheck';
    label.id = 'filmStoreSizeLabel';
    const root = document.querySelector('.sb-layout');
    if (root) root.style.position = 'relative';
    let anchor = document.getElementById('filmStoreSizeAnchor');
    if (!anchor && root) {
      anchor = document.createElement('div');
      anchor.id = 'filmStoreSizeAnchor';
      anchor.style.cssText = 'position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;pointer-events:none;';
      root.appendChild(anchor);
    }
    if (anchor) {
      const state = window.__filmCam || { scale: 1, x: 0, y: 0 };
      const a = box.getBoundingClientRect();
      const b = label.getBoundingClientRect();
      const vx = (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2;
      const vy = (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2;
      anchor.style.left = `${(vx - state.x) / state.scale}px`;
      anchor.style.top = `${(vy - state.y) / state.scale}px`;
    }
    let focus = document.getElementById('filmStoreSizeFocus');
    if (!focus) {
      focus = document.createElement('div');
      focus.id = 'filmStoreSizeFocus';
      focus.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;background:transparent;';
      document.body.appendChild(focus);
      const track = () => {
        const check = document.getElementById('filmStoreSizeCheck');
        const name = document.getElementById('filmStoreSizeLabel');
        const el = document.getElementById('filmStoreSizeFocus');
        if (check && name && el && check.isConnected && name.isConnected) {
          const a = check.getBoundingClientRect();
          const b = name.getBoundingClientRect();
          const left = Math.min(a.left, b.left);
          const top = Math.min(a.top, b.top);
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          el.style.width = `${Math.max(a.right, b.right) - left}px`;
          el.style.height = `${Math.max(a.bottom, b.bottom) - top}px`;
        }
        window.__filmStoreFocusRaf = requestAnimationFrame(track);
      };
      if (!window.__filmStoreFocusRaf) track();
    }
    return true;
  });
  if (!tagged) throw new Error('Store Size is not in the coefficient table');
}

async function filmCamera(page, selector, scale) {
  const ok = await page.evaluate(({ selector, scale }) => {
    const root = document.querySelector('.sb-layout');
    if (!root) return false;
    if (!document.getElementById('filmCameraCss')) {
      const style = document.createElement('style');
      style.id = 'filmCameraCss';
      style.textContent = [
        '#filmRSquared.film-r2-read #kpiRSquared { white-space: nowrap; }',
        '#filmRSquared.film-r2-read .full-model-ref {',
        '  font-size: 0.78em !important;',
        '  font-weight: 750;',
        '  color: #f8fafc;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }
    if (!window.__filmCam) {
      root.style.transformOrigin = '0 0';
      root.style.transition = 'transform 520ms cubic-bezier(.22,.61,.24,1)';
      root.style.willChange = 'transform';
      window.__filmCam = { scale: 1, x: 0, y: 0 };
    }
    const home = !selector;
    const target = home ? root : document.querySelector(selector);
    if (!target) return false;
    const state = window.__filmCam;
    const rect = target.getBoundingClientRect();
    const next = home ? 1 : Number(scale) || 1;
    const cx = (rect.left + rect.width / 2 - state.x) / state.scale;
    const cy = (rect.top + rect.height / 2 - state.y) / state.scale;
    const x = home ? 0 : window.innerWidth / 2 - cx * next;
    const y = home ? 0 : window.innerHeight / 2 - cy * next;
    root.style.transform = `translate(${x}px, ${y}px) scale(${next})`;
    window.__filmCam = { scale: next, x, y };
    return true;
  }, { selector, scale });
  if (!ok) throw new Error(`Camera target missing: ${selector || 'full view'}`);
  await page.waitForTimeout(PROBE ? 40 : 540);
}

async function tagPredictions(page) {
  const visible = await page.evaluate(() => {
    const button = document.querySelector('.sb-item[data-tab="predictions"]');
    if (!button) return false;
    button.id = 'filmPredictionsNav';
    const box = button.getBoundingClientRect();
    return box.width > 40 && box.height > 24 && box.top > 8 && box.bottom < window.innerHeight - 8;
  });
  if (!visible) throw new Error('Predictions is not on screen in the sidebar');
}

async function showFilmCaption(page, text) {
  await page.evaluate((caption) => {
    let el = document.getElementById('filmCaption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'filmCaption';
      el.style.cssText = [
        'position:fixed',
        'z-index:100001',
        'left:50%',
        'bottom:34px',
        'transform:translateX(-50%)',
        'padding:10px 18px',
        'border-radius:999px',
        'background:rgba(14,20,27,.9)',
        'border:1px solid rgba(226,232,240,.28)',
        'color:#f8fafc',
        'font:650 22px/1.2 "Segoe UI",sans-serif',
        'letter-spacing:.01em',
        'opacity:0',
        'transition:opacity 220ms ease',
        'pointer-events:none',
        'white-space:nowrap'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = caption;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }, text);
  await page.waitForTimeout(PROBE ? 20 : 220);
}

async function hideFilmCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById('filmCaption');
    if (el) el.style.opacity = '0';
  });
  await page.waitForTimeout(PROBE ? 20 : 220);
}

async function toggleStoreSize(page) {
  const clicked = await page.evaluate(() => {
    const box = document.getElementById('filmStoreSizeCheck');
    if (!box) return false;
    box.checked = !box.checked;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  if (!clicked) throw new Error('Store Size checkbox is not available');
}

async function since(started, seconds) {
  return Math.max(0, seconds * 1000 - (Date.now() - started));
}

async function frameResults(page, mode) {
  await page.evaluate((which) => {
    const scroller = document.querySelector('#tab-results .ws-body');
    const target = which === 'equation'
      ? document.getElementById('equationSection')
      : document.querySelector('.reg-overview-block');
    if (!scroller || !target) return;
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - (which === 'equation' ? 280 : 0));
  }, mode);
}

async function results(page, { mark, note, stamp, omit }) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadFilm(page);
  await page.waitForFunction(() => {
    const r2 = document.getElementById('kpiRSquared');
    const table = document.getElementById('dataTableBody');
    const eq = document.getElementById('equationFormula');
    const overlay = document.getElementById('loadingOverlay');
    const view = document.getElementById('headerViewName');
    const variable = document.getElementById('headerVariableName');
    const sample = document.getElementById('headerSampleSize');
    const overviewTab = document.querySelector('#tab-results [data-reg-tab="results-overview"]');
    return r2 && /65\.63%/.test(r2.textContent || '')
      && table && /Store Size/.test(table.textContent || '')
      && eq && /Sales/.test(eq.textContent || '') && /Store Size/.test(eq.textContent || '')
      && view && /Results|Overview/.test(view.textContent || '')
      && overviewTab && overviewTab.classList.contains('active')
      && variable && /Sales/.test(variable.textContent || '')
      && sample && /120/.test(sample.textContent || '')
      && overlay && overlay.classList.contains('hidden');
  }, null, { timeout: 12000 });
  await page.evaluate(() => {
    const card = document.querySelector('.kpi-card--r2');
    if (card) card.id = 'filmRSquared';
  });
  await tagStoreSize(page);
  await frameResults(page, 'overview');
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(PROBE ? 40 : 180);
  mark();
  const line1 = dur('results-1');
  // Word times are seconds into each stem: R-squared 3.07, removed 1.04, "The value" 5.79.
  await page.waitForTimeout(PROBE ? 40 : 280);
  note('results-1');
  const say1 = Date.now();
  await page.waitForTimeout(PROBE ? 40 : await since(say1, 3.07 - 0.54));
  await filmCamera(page, '#filmRSquared', 2.25);
  await hot(page, '#filmRSquared', 1);
  await page.waitForTimeout(PROBE ? 40 : await since(say1, 6.5));
  await clearFilmHighlight(page);
  await filmCamera(page, '#filmStoreSizeAnchor', 1.72);
  await hot(page, '#filmStoreSizeFocus', 1);
  const actionVisible = await page.evaluate(() => {
    const box = document.getElementById('filmStoreSizeCheck');
    const label = document.getElementById('filmStoreSizeLabel');
    if (!box || !label) return false;
    const a = box.getBoundingClientRect();
    const b = label.getBoundingClientRect();
    const m = 16;
    return a.width > 8 && a.left > m && b.right < window.innerWidth - m && a.top > m && b.bottom < window.innerHeight - m;
  });
  if (!actionVisible) throw new Error('Store Size label and checkbox are not both on screen');
  await page.waitForTimeout(PROBE ? 40 : await since(say1, line1));
  note('results-2');
  const say2 = Date.now();
  await page.waitForTimeout(PROBE ? 40 : await since(say2, 1.04));
  const beforeR2 = await page.locator('#kpiRSquared').innerText();
  const beforeEquation = await page.locator('#equationFormula').innerText();
  await toggleStoreSize(page);
  await page.waitForFunction(() => {
    const overlay = document.getElementById('loadingOverlay');
    const r2 = (document.getElementById('kpiRSquared')?.textContent || '').trim();
    const eq = document.getElementById('equationFormula')?.textContent || '';
    const row = [...document.querySelectorAll('#dataTableBody tr')].find((tr) => /Store Size/.test(tr.textContent || ''));
    const box = row && row.querySelector('.coef-include-check');
    return overlay && overlay.classList.contains('hidden')
      && !/^65\.63%/.test(r2)
      && !/Store Size/.test(eq)
      && row && row.classList.contains('coef-row-excluded')
      && box && !box.checked;
  }, null, { timeout: 8000 });
  if (beforeR2 === await page.locator('#kpiRSquared').innerText()) {
    throw new Error('Removing Store Size did not change R²');
  }
  if (beforeEquation === await page.locator('#equationFormula').innerText()) {
    throw new Error('Removing Store Size did not change the equation');
  }
  const reduced = await page.locator('#kpiRSquared').innerText();
  if (!/62\.96%/.test(reduced) || !/65\.63%/.test(reduced)) {
    throw new Error(`The refit did not show both fit values: ${reduced}`);
  }
  await tagStoreSize(page);
  await clearFilmHighlight(page);
  await hot(page, '#filmStoreSizeFocus', 1);
  await page.waitForTimeout(PROBE ? 40 : await since(say2, 5.2));
  await page.evaluate(() => document.getElementById('filmRSquared')?.classList.add('film-r2-read'));
  await clearFilmHighlight(page);
  await filmCamera(page, '#filmRSquared', 2.7);
  await hot(page, '#filmRSquared', 1);
  const parenPx = await page.evaluate(() => {
    const el = document.querySelector('#filmRSquared .full-model-ref');
    return el ? el.getBoundingClientRect().height : 0;
  });
  if (parenPx < 34) {
    throw new Error(`Full-model R² is ${parenPx.toFixed(1)}px tall, too small to read in the website player`);
  }
  await page.waitForTimeout(PROBE ? 40 : await since(say2, 8.74));
  await clearFilmHighlight(page);
  await page.evaluate(() => document.getElementById('filmRSquared')?.classList.remove('film-r2-read'));
  await tagStoreSize(page);
  await filmCamera(page, '#filmStoreSizeAnchor', 1.72);
  await hot(page, '#filmStoreSizeFocus', 1);
  await page.evaluate(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    overlay.style.transition = 'none';
    overlay.style.display = 'none';
  });
  await toggleStoreSize(page);
  await page.waitForTimeout(PROBE ? 40 : 400);
  const restoreCut = stamp();
  await page.evaluate(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = '';
  });
  await page.waitForFunction(() => {
    const overlay = document.getElementById('loadingOverlay');
    const r2 = (document.getElementById('kpiRSquared')?.textContent || '').trim();
    const eq = document.getElementById('equationFormula')?.textContent || '';
    const n = document.getElementById('kpiN')?.textContent || '';
    const sample = document.getElementById('headerSampleSize')?.textContent || '';
    const row = [...document.querySelectorAll('#dataTableBody tr')].find((tr) => /Store Size/.test(tr.textContent || ''));
    const box = row && row.querySelector('.coef-include-check');
    return overlay && overlay.classList.contains('hidden')
      && /65\.63%/.test(r2)
      && /Store Size/.test(eq)
      && /Ad Spend/.test(eq)
      && /120/.test(n)
      && /120/.test(sample)
      && row && !row.classList.contains('coef-row-excluded')
      && box && box.checked;
  }, null, { timeout: 8000 });
  await clearFilmHighlight(page);
  await filmCamera(page, null, 1);
  const wide = await page.evaluate(() => {
    const cam = window.__filmCam || { scale: 1 };
    const r2 = (document.getElementById('kpiRSquared')?.textContent || '').trim();
    return cam.scale === 1 && /^65\.63%/.test(r2);
  });
  if (!wide) throw new Error('The restored model is not back on the full view at 65.63%');
  await page.waitForTimeout(PROBE ? 20 : 350);
  omit(restoreCut, stamp());
  await page.waitForTimeout(PROBE ? 40 : 1000);
  await clearFilmHighlight(page);
  await page.evaluate(() => {
    const root = document.querySelector('.sb-layout');
    if (root) {
      root.style.transition = 'none';
      root.style.transform = 'none';
    }
    window.__filmCam = { scale: 1, x: 0, y: 0 };
    const navBtn = document.querySelector('.sb-item[data-tab="predictions"]');
    if (!navBtn) return;
    const ring = document.createElement('div');
    ring.className = 'jmp-ring';
    const cursor = document.createElement('div');
    cursor.className = 'jmp-cursor';
    navBtn.classList.add('jmp-focus');
    const rect = navBtn.getBoundingClientRect();
    ring.style.left = `${rect.left - 4}px`;
    ring.style.top = `${rect.top - 3}px`;
    ring.style.width = `${rect.width + 8}px`;
    ring.style.height = `${rect.height + 6}px`;
    cursor.style.left = `${rect.left + 18}px`;
    cursor.style.top = `${rect.top + rect.height / 2 - 2}px`;
    document.body.append(ring, cursor);
  });
  note('results-3');
  await page.waitForTimeout(PROBE ? 40 : 460);
}

async function scenario(page, { mark, note }) {
  await loadFilm(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => switchTab('pred-scenario'));
  await page.waitForFunction(() => {
    const value = document.getElementById('predictedValue');
    const slider = document.getElementById('input-Ad Spend');
    const chart = document.querySelector('#predProfileChart .highcharts-series');
    const overlay = document.getElementById('loadingOverlay');
    const box = chart && chart.getBoundingClientRect();
    return !document.body.classList.contains('jmp-busy')
      && !document.body.classList.contains('jmp-turning')
      && value && /116\.37/.test(value.textContent || '')
      && slider && Number(slider.value) > 0
      && box && box.width > 40 && box.height > 40
      && overlay && overlay.classList.contains('hidden');
  }, null, { timeout: 15000 });
  await page.waitForTimeout(PROBE ? 40 : 900);
  mark();
  await filmScenarioChapter(page, note);
}

async function filmScenarioChapter(page, note) {
  await page.evaluate(() => {
    const scroller = document.querySelector('#tab-predictions .ws-body');
    if (scroller) scroller.scrollTop = 0;
    const slider = document.getElementById('input-Ad Spend');
    const group = slider && slider.closest('.input-group');
    const card = document.querySelector('#tab-predictions .output-card.main-prediction');
    if (!group || !card) throw new Error('Scenario controls are missing');
    group.id = 'filmAdSpend';
    card.id = 'filmPredictedSales';
  });
  const before = await page.locator('#predictedValue').innerText();
  const beforeTitle = await page.locator('#predProfileTitle').innerText();
  if (!/116\.37/.test(before)) throw new Error(`Scenario did not open at 116.37: ${before}`);
  await page.waitForTimeout(PROBE ? 20 : 80);
  await showFilmCaption(page, 'Scenario Engine · What-if predictions');
  const openMs = PROBE ? 40 : 1000;
  const afterHotMs = PROBE ? 40 : 80;
  const steps = PROBE ? 2 : 12;
  const stepMs = PROBE ? 20 : 450;
  const afterDragMs = PROBE ? 40 : 300;
  const fadeMs = 200;
  const resultInMs = PROBE ? 40 : 220;
  const settleHoldMs = PROBE ? 40 : 3700;
  const handoffRoomMs = PROBE ? 0 : 3200;
  const hotMs = PROBE ? 40 : 320;
  const captionFadeMs = PROBE ? 20 : 220;
  const resultAt = openMs + captionFadeMs + hotMs + afterHotMs + steps * stepMs + afterDragMs + fadeMs + resultInMs;
  const voiceAt = Math.max(5900, resultAt + settleHoldMs - dur('scenario-1') * 1000 - 150);
  let voiced = false;
  let elapsed = 0;
  const voice = () => {
    if (voiced || elapsed < voiceAt) return;
    note('scenario-1');
    voiced = true;
  };
  await page.waitForTimeout(openMs);
  elapsed += openMs;
  await hideFilmCaption(page);
  elapsed += captionFadeMs;
  await hot(page, '#filmAdSpend', 1);
  elapsed += hotMs;
  await page.waitForTimeout(afterHotMs);
  elapsed += afterHotMs;
  voice();
  await page.evaluate(() => {
    const slider = document.getElementById('input-Ad Spend');
    slider.dataset.filmFrom = slider.value;
  });
  for (let i = 1; i <= steps; i += 1) {
    await page.evaluate(({ i, steps }) => {
      const slider = document.getElementById('input-Ad Spend');
      const from = Number(slider.dataset.filmFrom);
      const to = Number(slider.max);
      slider.value = String(from + (to - from) * (i / steps));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, { i, steps });
    elapsed += stepMs;
    voice();
    await page.waitForTimeout(stepMs);
  }
  await page.waitForTimeout(afterDragMs);
  elapsed += afterDragMs;
  const after = await page.locator('#predictedValue').innerText();
  const afterTitle = await page.locator('#predProfileTitle').innerText();
  const afterHeld = await page.locator('#predProfileHeld').innerText();
  if (!/116/.test(before) || !/169|170/.test(after)) {
    throw new Error(`Scenario did not move from about 116 to about 170: ${before} -> ${after}`);
  }
  if (beforeTitle === afterTitle) throw new Error('Moving ad spend did not change the profile');
  if (!/Ad Spend \d/.test(afterHeld) || /Ad Spend held at/.test(afterHeld)) {
    throw new Error(`The profile left Ad Spend during the move: ${afterHeld}`);
  }
  if (!/Store Size held at/.test(afterHeld)) throw new Error(`Store size was not held: ${afterHeld}`);
  await clearFilmHighlight(page);
  const tagged = await page.evaluate(() => {
    const chart = window._predProfileChart;
    const series = chart && chart.series.find((item) => item.name === 'Current scenario');
    const point = series && series.points && series.points[0];
    const el = point && point.graphic && point.graphic.element;
    if (!el) return false;
    el.id = 'filmScenarioMarker';
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
  if (!tagged) throw new Error('The chart marker is not on the settled profile');
  await showFilmHighlights(page, ['#filmPredictedSales', '#filmScenarioMarker'], { zoom: 1, tone: 'glow' });
  await page.waitForTimeout(resultInMs);
  elapsed += fadeMs + resultInMs;
  voice();
  if (!voiced) note('scenario-1');
  await page.waitForTimeout(settleHoldMs + handoffRoomMs);
  await clearFilmHighlight(page);
}

async function influence(page, { mark, note, say }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('diag-influence'));
  await page.waitForSelector('.res-outliers-table', { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 40 : 400);
  await page.evaluate(() => {
    const table = document.querySelector('.res-outliers-table');
    if (table) {
      table.id = 'filmFlagged';
      table.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  });
  await page.waitForTimeout(PROBE ? 40 : 350);
  const flagged = await page.locator('#filmFlagged').innerText();
  if (!/Outlier/.test(flagged)) throw new Error('Flagged observation table did not list the selection');
  await hot(page, '#filmFlagged', 1);
  await say('influence-1');
  await page.waitForTimeout(PROBE ? 40 : 2200);
  await clearFilmHighlight(page);
  await hot(page, '.res-refit-btn', 1);
  await page.waitForTimeout(PROBE ? 40 : 600);
  await page.click('.res-refit-btn');
  await page.waitForSelector('#resComparisonPanel', { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 40 : 400);
  const text = await page.locator('#resComparisonPanel').innerText();
  if (!/original model/i.test(text) || !/refitted model/i.test(text)) {
    throw new Error(`Refit comparison did not appear: ${text.slice(0, 240)}`);
  }
  await page.evaluate(() => document.getElementById('resComparisonPanel')?.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await clearFilmHighlight(page);
  await hot(page, '#resComparisonPanel', 1);
  await say('influence-2');
  await page.waitForTimeout(PROBE ? 40 : 3200);
  await clearFilmHighlight(page);
  await hot(page, '#resComparisonPanel button', 1);
  note('influence-3');
  const third = dur('influence-3');
  await page.waitForTimeout(third * 0.55 * 1000);
  await page.click('#resComparisonPanel button');
  await page.waitForFunction(() => {
    const panel = document.getElementById('resComparisonPanel');
    return panel && panel.style.display === 'none';
  }, null, { timeout: 4000 });
  await clearFilmHighlight(page);
  await hot(page, '#filmFlagged', 1);
  await page.waitForTimeout(Math.max(0, third * 0.45) * 1000);
  await page.waitForTimeout(PROBE ? 40 : 2200);
  await clearFilmHighlight(page);
}

async function brand(page, file, seconds, { mark }) {
  await page.goto(`${BASE}/Statistico/regression/produce/${file}`, { waitUntil: 'load' });
  await page.evaluate(() => document.body.classList.add('go'));
  mark();
  await page.waitForTimeout((PROBE ? Math.min(seconds, 0.4) : seconds) * 1000);
}

async function routeCharts(context) {
  const vendor = path.join(ROOT, 'statistico-analytics/dialogs/views/shared/vendor/highcharts');
  await context.route('https://code.highcharts.com/**', async (route) => {
    const url = route.request().url();
    const file = url.includes('exporting')
      ? 'modules/exporting.js'
      : url.includes('highcharts-more') ? 'highcharts-more.js' : 'highcharts.js';
    await route.fulfill({ path: path.join(vendor, file), contentType: 'text/javascript' });
  });
}

async function recordScene(browser, name, run) {
  const context = await browser.newContext({
    viewport: { width: 1728, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: WORK, size: { width: 1728, height: 1080 } }
  });
  await routeCharts(context);
  await context.addInitScript(() => {
    const timer = setInterval(() => {
      if (!window.Highcharts) return;
      window.Highcharts.setOptions({
        chart: { animation: false },
        plotOptions: { series: { animation: false }, column: { animation: false }, scatter: { animation: false } }
      });
      clearInterval(timer);
    }, 30);
  });
  const page = await context.newPage();
  const t0 = Date.now();
  let useful = t0;
  const cues = [];
  const cuts = [];
  const mark = () => { useful = Date.now(); };
  const stamp = () => Math.max(0, (Date.now() - useful) / 1000);
  const note = (id) => cues.push({ id, at: stamp() });
  const omit = (from, to) => cuts.push({ from, to });
  const say = async (id) => {
    note(id);
    await page.waitForTimeout(dur(id) * 1000);
  };
  let highlights = [];
  try {
    await run(page, { mark, note, say, stamp, omit });
    highlights = await readHighlightLog(page, useful).catch(() => []);
    if (!process.argv.includes('--preview-results')) await shot(page, name);
  } catch (err) {
    await shot(page, `${name}-error`).catch(() => {});
    throw err;
  }
  const video = page.video();
  await page.close();
  await context.close();
  const src = await video.path();
  const dest = path.join(WORK, `${name}.webm`);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.copyFileSync(src, dest);
  try { fs.unlinkSync(src); } catch (_e) {}
  return { id: name, src: dest.replace(/\\/g, '/'), trim: Math.max(0, (useful - t0) / 1000), cues, cuts, highlights };
}

function mixSpeech(cues, duration, dest) {
  const args = ['-y'];
  const filters = [];
  const mix = [];
  cues.forEach((cue, i) => {
    args.push('-i', path.join(AUDIO, `${cue.id}.mp3`));
    const ms = Math.max(0, Math.round(Number(cue.at) * 1000));
    filters.push(`[${i}:a]aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=mono,adelay=${ms}:all=1,apad=pad_dur=${duration.toFixed(3)}[a${i}]`);
    mix.push(`[a${i}]`);
  });
  const raw = path.join(WORK, 'results-speech.wav');
  args.push(
    '-filter_complex', `${filters.join(';')};${mix.join('')}amix=inputs=${cues.length}:normalize=0:duration=longest:dropout_transition=0[a]`,
    '-map', '[a]', '-t', duration.toFixed(3), raw
  );
  const mixed = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (mixed.status !== 0) throw new Error((mixed.stderr || 'speech mix failed').slice(-800));
  return leveledVoice(raw, dest);
}

function trimPicture(scene, dest) {
  const trimmed = spawnSync(FFMPEG, [
    '-y', '-i', scene.src, '-ss', String(scene.trim),
    '-vf', 'scale=1728:1080:flags=lanczos,fps=30,format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
    dest
  ], { encoding: 'utf8' });
  if (trimmed.status !== 0) throw new Error((trimmed.stderr || `picture failed for ${scene.id}`).slice(-800));
  return mediaDuration(dest);
}

function muxVoice(picture, voice, dest) {
  const muxed = spawnSync(FFMPEG, [
    '-y', '-i', picture, '-i', voice,
    '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '1',
    '-movflags', '+faststart', dest
  ], { encoding: 'utf8' });
  if (muxed.status !== 0) throw new Error((muxed.stderr || 'mux failed').slice(-800));
}

function exciseSpan(picture, span, dest) {
  const gap = span ? Number(span.to) - Number(span.from) : 0;
  if (!span || gap < 0.08) {
    fs.copyFileSync(picture, dest);
    return mediaDuration(dest);
  }
  const cut = spawnSync(FFMPEG, [
    '-y', '-i', picture,
    '-filter_complex', `[0:v]trim=0:${Number(span.from).toFixed(3)},setpts=PTS-STARTPTS[a];[0:v]trim=start=${Number(span.to).toFixed(3)},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]`,
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
    dest
  ], { encoding: 'utf8' });
  if (cut.status !== 0) throw new Error((cut.stderr || 'restore cut failed').slice(-800));
  return mediaDuration(dest);
}

function shiftPast(cues, span) {
  const gap = span ? Math.max(0, Number(span.to) - Number(span.from)) : 0;
  if (!gap) return cues.map((cue) => ({ ...cue }));
  return cues.map((cue) => ({
    id: cue.id,
    at: Number(cue.at) > Number(span.from) ? Number(cue.at) - gap : Number(cue.at)
  }));
}

function buildWorkspaceReveal(fromPicture, toPicture, dest) {
  const frameDir = path.join(WORK, 'reveal-frames');
  fs.rmSync(frameDir, { recursive: true, force: true });
  fs.mkdirSync(frameDir, { recursive: true });
  const fromPng = path.join(frameDir, 'from.png');
  const toPng = path.join(frameDir, 'to.png');
  const grab = (src, seek, out) => {
    const args = ['-y'];
    if (seek) args.push('-sseof', seek);
    args.push('-i', src, '-frames:v', '1', out);
    const shot = spawnSync(FFMPEG, args, { encoding: 'utf8' });
    if (shot.status !== 0) throw new Error((shot.stderr || 'reveal frame failed').slice(-500));
  };
  grab(fromPicture, '-0.04', fromPng);
  grab(toPicture, '', toPng);
  const script = path.join(frameDir, 'reveal.py');
  fs.writeFileSync(script, `
from PIL import Image, ImageFilter
import math
src = Image.open(r'''${fromPng}''').convert('RGB')
dst = Image.open(r'''${toPng}''').convert('RGB')
w, h = src.size
side, head, feather = 300, 108, 88
frames = 12
for i in range(frames):
    t = i / (frames - 1)
    ease = 1 - (1 - t) ** 3
    edge = side + (w - side + feather) * ease
    out = src.copy()
    base = src.crop((side, head, w, h))
    over = dst.crop((side, head, w, h))
    mask = Image.new('L', (w - side, h - head), 0)
    pix = mask.load()
    for x in range(w - side):
        absx = x + side
        if absx <= edge - feather:
            alpha = 255
        elif absx >= edge:
            alpha = 0
        else:
            alpha = int(255 * (edge - absx) / feather)
        for y in range(h - head):
            pix[x, y] = alpha
    mask = mask.filter(ImageFilter.GaussianBlur(radius=10))
    out.paste(Image.composite(over, base, mask), (side, head))
    if i == frames - 1:
        out.paste(dst.crop((side, 0, w, head)), (side, 0))
    out.save(r'''${frameDir}''' + f'/f-{i:02d}.png')
`);
  const drawn = spawnSync('py', ['-3', script], { encoding: 'utf8' });
  if (drawn.status !== 0) throw new Error((drawn.stderr || drawn.stdout || 'reveal draw failed').slice(-800));
  const encoded = spawnSync(FFMPEG, [
    '-y', '-framerate', '30', '-i', path.join(frameDir, 'f-%02d.png'),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    dest
  ], { encoding: 'utf8' });
  if (encoded.status !== 0) throw new Error((encoded.stderr || 'reveal encode failed').slice(-800));
  return mediaDuration(dest);
}

function encodeResultsPreview(resultsScene, scenarioScene) {
  const outDir = path.join(ROOT, 'Statistico/regression/04_review/preview');
  fs.mkdirSync(outDir, { recursive: true });
  const resultsRaw = path.join(WORK, 'results-picture.mp4');
  const picture = path.join(WORK, 'results-cut-picture.mp4');
  const scenarioPicture = path.join(WORK, 'scenario-picture.mp4');
  const reveal = path.join(WORK, 'workspace-reveal.mp4');
  const joined = path.join(WORK, 'results-scenario-picture.mp4');
  const chapter = path.join(outDir, 'results-chapter.mp4');
  const scenarioClip = path.join(outDir, 'scenario-highlight.mp4');
  const combined = path.join(outDir, 'results-scenario.mp4');
  trimPicture(resultsScene, resultsRaw);
  const span = (resultsScene.cuts || [])[0];
  const resultsDur = exciseSpan(resultsRaw, span, picture);
  const scenarioDur = trimPicture(scenarioScene, scenarioPicture);
  const revealDur = buildWorkspaceReveal(picture, scenarioPicture, reveal);
  const joinedRun = spawnSync(FFMPEG, [
    '-y', '-i', picture, '-i', reveal, '-i', scenarioPicture,
    '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]',
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    joined
  ], { encoding: 'utf8' });
  if (joinedRun.status !== 0) throw new Error((joinedRun.stderr || 'workspace reveal failed').slice(-800));
  const combinedDur = mediaDuration(joined);
  const resultsCues = shiftPast(resultsScene.cues || [], span);
  const handoff = resultsCues.find((cue) => cue.id === 'results-3');
  const handoffAt = handoff ? Number(handoff.at) : resultsDur;
  const handoffEnd = handoff ? handoffAt + mediaDuration(path.join(AUDIO, 'results-3.mp3')) : handoffAt;
  const cues = resultsCues.map((cue) => ({ ...cue }));
  for (const cue of scenarioScene.cues || []) {
    let at = resultsDur + revealDur + Number(cue.at);
    if (cue.id === 'scenario-1' && at < handoffEnd + 0.2) at = handoffEnd + 0.2;
    cues.push({ id: cue.id, at });
  }
  const voice = mixSpeech(cues, combinedDur, path.join(WORK, 'handoff-level.wav'));
  muxVoice(joined, voice, combined);
  const chapterPicture = path.join(WORK, 'results-chapter-picture.mp4');
  const chapterCut = spawnSync(FFMPEG, [
    '-y', '-i', picture, '-t', resultsDur.toFixed(3),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an',
    chapterPicture
  ], { encoding: 'utf8' });
  if (chapterCut.status !== 0) throw new Error((chapterCut.stderr || 'chapter trim failed').slice(-800));
  const chapterVoice = mixSpeech(resultsCues, resultsDur, path.join(WORK, 'results-level.wav'));
  muxVoice(chapterPicture, chapterVoice, chapter);
  const scenarioWithReveal = path.join(WORK, 'scenario-with-reveal.mp4');
  const scenarioJoin = spawnSync(FFMPEG, [
    '-y', '-i', reveal, '-i', scenarioPicture,
    '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]',
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
    scenarioWithReveal
  ], { encoding: 'utf8' });
  if (scenarioJoin.status !== 0) throw new Error((scenarioJoin.stderr || 'scenario reveal failed').slice(-800));
  const scenarioClipDur = mediaDuration(scenarioWithReveal);
  const scenarioCues = cues
    .filter((cue) => cue.id === 'results-3' || cue.id === 'scenario-1')
    .map((cue) => ({ id: cue.id, at: Math.max(0, Number(cue.at) - resultsDur) }));
  const scenarioVoice = mixSpeech(scenarioCues, scenarioClipDur, path.join(WORK, 'scenario-level.wav'));
  muxVoice(scenarioWithReveal, scenarioVoice, scenarioClip);
  console.log(chapter);
  console.log(scenarioClip);
  console.log(combined);
}

async function main() {
  const previewResults = process.argv.includes('--preview-results');
  const preview = previewResults || process.argv.includes('--preview-scenario');
  if (!preview && !fs.existsSync(path.join(WORK, 'reference.json'))) {
    throw new Error('Run validate-regression.mjs before capture. The reference file is missing.');
  }
  const server = serve();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  try {
    const jobs = previewResults ? [['results', results], ['scenario', scenario]] : preview ? [['scenario', scenario]] : [
      ['overview', overview],
      ['enter', (page, api) => brand(page, 'enter.html', 2.4, api)],
      ['effects', effects],
      ['scenario', scenario],
      ['influence', influence],
      ['catalogue', async (page, api) => {
        await page.goto(`${BASE}/Statistico/regression/produce/catalogue.html?page=1`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 40 : 350);
        await api.say('catalogue-1');
        await page.waitForTimeout(PROBE ? 40 : 12000);
      }],
      ['catalogue2', (page, api) => brand(page, 'catalogue.html?page=2', 15, api)],
      ['bridge', (page, api) => brand(page, 'bridge.html', 1.2, api)],
      ['thanks', async (page, api) => {
        await page.goto(`${BASE}/Statistico/regression/produce/thanks.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 80 : 420);
        await api.say('thanks-1');
        await page.waitForTimeout(PROBE ? 80 : 800);
      }],
      ['close', async (page, api) => {
        await page.goto(`${BASE}/Statistico/regression/produce/close.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 80 : 450);
        await api.say('close-1');
        await page.waitForTimeout(PROBE ? 80 : 1200);
      }]
    ];
    for (const [name, fn] of jobs) {
      process.stdout.write(`scene ${name}\n`);
      scenes.push(await recordScene(browser, name, fn));
    }
    const sceneFile = previewResults
      ? path.join(WORK, 'preview-results-scenes.json')
      : preview ? path.join(WORK, 'preview-scenes.json') : path.join(WORK, 'scenes.json');
    fs.writeFileSync(sceneFile, JSON.stringify(scenes, null, 2));
    console.log(JSON.stringify(scenes.map((scene) => ({ id: scene.id, trim: scene.trim, cuts: scene.cuts, cues: scene.cues })), null, 2));
    if (previewResults) {
      encodeResultsPreview(scenes[0], scenes[1]);
    } else if (preview) {
      const scene = scenes[0];
      const outDir = path.join(ROOT, 'Statistico/regression/04_review/preview');
      fs.mkdirSync(outDir, { recursive: true });
      const out = path.join(outDir, 'scenario-highlight.mp4');
      const cue = (scene.cues || []).find((item) => item.id === 'scenario-1');
      const audio = path.join(AUDIO, 'scenario-1.mp3');
      const voice = cue && fs.existsSync(audio) ? leveledVoice(audio) : null;
      const args = ['-y', '-ss', String(scene.trim), '-i', scene.src];
      if (voice) args.push('-itsoffset', String(cue.at), '-i', voice);
      args.push(
        '-vf', 'scale=1728:1080:flags=lanczos,fps=30,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p'
      );
      if (voice) args.push('-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000');
      args.push('-movflags', '+faststart', out);
      const encoded = spawnSync(FFMPEG, args, { encoding: 'utf8' });
      if (encoded.status !== 0) throw new Error((encoded.stderr || 'preview encode failed').slice(-800));
      console.log(out);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

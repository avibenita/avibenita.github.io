import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { clearFilmHighlight, readHighlightLog, showFilmHighlight } from '../../video-workflow/overlay/highlight.mjs';

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
  await showFilmHighlight(page, selector, { zoom });
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

async function scenario(page, { mark, note, say }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('pred-scenario'));
  await page.waitForFunction(() => {
    const value = document.getElementById('predictedValue');
    const chart = document.querySelector('#predProfileChart .highcharts-container, #predProfileChart svg');
    return value && value.textContent && value.textContent !== '-' && chart;
  }, null, { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 40 : 500);
  const before = await page.locator('#predictedValue').innerText();
  const beforeTitle = await page.locator('#predProfileTitle').innerText();
  await hot(page, '[id="input-Ad Spend"]', 1);
  await page.waitForTimeout(PROBE ? 40 : 1100);
  note('scenario-1');
  const first = dur('scenario-1');
  await page.waitForTimeout(first * 0.42 * 1000);
  await page.evaluate(() => {
    const slider = document.getElementById('input-Ad Spend');
    slider.value = slider.max;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(PROBE ? 40 : 450);
  const after = await page.locator('#predictedValue').innerText();
  const afterTitle = await page.locator('#predProfileTitle').innerText();
  if (before === after) throw new Error('Moving ad spend did not change the prediction');
  if (beforeTitle === afterTitle) throw new Error('Moving ad spend did not change the profile');
  await clearFilmHighlight(page);
  await page.evaluate(() => {
    const label = document.querySelector('.output-card.main-prediction .output-label');
    const value = document.getElementById('predictedValue');
    const sub = document.querySelector('.output-card.main-prediction .output-sublabel');
    const host = document.querySelector('.output-card.main-prediction');
    const nodes = [label, value, sub].filter(Boolean);
    if (!host || nodes.length < 2) return;
    const style = getComputedStyle(host);
    if (style.position === 'static') host.style.position = 'relative';
    const hostRect = host.getBoundingClientRect();
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const rects = nodes.map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 ? rect : node.getBoundingClientRect();
    });
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    let marker = document.getElementById('filmPredictionEstimate');
    if (!marker) {
      marker = document.createElement('div');
      marker.id = 'filmPredictionEstimate';
      marker.style.position = 'absolute';
      marker.style.pointerEvents = 'none';
      marker.style.background = 'transparent';
      host.appendChild(marker);
    }
    marker.style.left = `${left - hostRect.left - borderLeft}px`;
    marker.style.top = `${top - hostRect.top - borderTop}px`;
    marker.style.width = `${Math.max(1, right - left)}px`;
    marker.style.height = `${Math.max(1, bottom - top)}px`;
  });
  await hot(page, '#filmPredictionEstimate', 1);
  if (process.env.FILM_PREVIEW === '1') {
    await page.waitForTimeout(280);
    await shot(page, 'preview-prediction');
  }
  await page.waitForTimeout(Math.max(0, first * 0.58) * 1000);
  await page.waitForTimeout(PROBE ? 40 : 3000);
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
  const mark = () => { useful = Date.now(); };
  const note = (id) => cues.push({ id, at: Math.max(0, (Date.now() - useful) / 1000) });
  const say = async (id) => {
    note(id);
    await page.waitForTimeout(dur(id) * 1000);
  };
  let highlights = [];
  try {
    await run(page, { mark, note, say });
    highlights = await readHighlightLog(page, useful).catch(() => []);
    await shot(page, name);
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
  return { id: name, src: dest.replace(/\\/g, '/'), trim: Math.max(0, (useful - t0) / 1000), cues, highlights };
}

async function main() {
  const preview = process.argv.includes('--preview-scenario');
  if (!preview && !fs.existsSync(path.join(WORK, 'reference.json'))) {
    throw new Error('Run validate-regression.mjs before capture. The reference file is missing.');
  }
  const server = serve();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  try {
    const jobs = preview ? [['scenario', scenario]] : [
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
    const sceneFile = preview ? path.join(WORK, 'preview-scenes.json') : path.join(WORK, 'scenes.json');
    fs.writeFileSync(sceneFile, JSON.stringify(scenes, null, 2));
    console.log(JSON.stringify(scenes.map((scene) => ({ id: scene.id, trim: scene.trim, cues: scene.cues })), null, 2));
    if (preview) {
      const scene = scenes[0];
      const outDir = path.join(ROOT, 'Statistico/regression/04_review/preview');
      fs.mkdirSync(outDir, { recursive: true });
      const out = path.join(outDir, 'scenario-highlight.mp4');
      const cue = (scene.cues || []).find((item) => item.id === 'scenario-1');
      const audio = path.join(AUDIO, 'scenario-1.mp3');
      const args = ['-y', '-ss', String(scene.trim), '-i', scene.src];
      if (cue && fs.existsSync(audio)) args.push('-itsoffset', String(cue.at), '-i', audio);
      args.push(
        '-vf', 'scale=1728:1080:flags=lanczos,fps=30,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p'
      );
      if (cue && fs.existsSync(audio)) args.push('-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac');
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

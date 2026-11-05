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
  await page.waitForTimeout(PROBE ? 40 : 280);
}

async function park(page) {
  await page.mouse.move(12, 12);
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

async function mode(page, attr, value) {
  const sel = `.ws-mode-tab[data-${attr}="${value}"]`;
  await page.waitForSelector(sel, { timeout: 8000 });
  await hot(page, sel, 1);
  await page.click(sel);
  await page.waitForTimeout(PROBE ? 80 : 450);
  await park(page);
}

async function overview(page, { mark, say }) {
  await loadFilm(page);
  mark();
  await hot(page, '#kpiStrip', 1.16);
  await say('overview-1');
  await page.waitForTimeout(PROBE ? 80 : 2000);
  await clearFilmHighlight(page);
}

async function coefficients(page, { mark, say }) {
  await loadFilm(page);
  mark();
  await mode(page, 'reg-tab', 'results-detail');
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#dataTableBody tr')].find((tr) => /Ad Spend/.test(tr.cells[0]?.textContent || ''));
    if (!row) return;
    row.id = 'filmAdSpend';
    row.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await page.waitForTimeout(PROBE ? 60 : 400);
  const text = await page.locator('#filmAdSpend').innerText();
  if (!text.includes('1.76') || !text.includes('1.51') || !text.includes('2.01')) {
    throw new Error(`Ad Spend row is not the verified display: ${text}`);
  }
  await hot(page, '#filmAdSpend', 1);
  await say('coefficients-1');
  await page.waitForTimeout(PROBE ? 80 : 2400);
  await clearFilmHighlight(page);
}

async function scenario(page, { mark, note, say }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('pred-scenario'));
  await page.waitForFunction(() => {
    const el = document.getElementById('predictedValue');
    return el && el.textContent && el.textContent !== '-';
  }, null, { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 60 : 400);
  const before = await page.locator('#predictedValue').innerText();
  await hot(page, '[id="input-Ad Spend"]', 1.2);
  note('scenario-1');
  const total = dur('scenario-1');
  await page.waitForTimeout(total * 0.38 * 1000);
  await page.evaluate(() => {
    const slider = document.getElementById('input-Ad Spend');
    slider.value = slider.max;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(PROBE ? 60 : 350);
  const after = await page.locator('#predictedValue').innerText();
  if (before === after) throw new Error('Moving ad spend did not change predicted sales');
  await hot(page, '#predictedValue', 1.16);
  await page.waitForTimeout(Math.max(0, total * 0.62) * 1000);
  await page.waitForTimeout(PROBE ? 80 : 2200);
  await clearFilmHighlight(page);
}

async function plots(page, { mark, say }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('diag-plots'));
  await page.waitForFunction(() => !!document.querySelector('#resChart1 svg, #resChart1 .highcharts-container'), null, { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 60 : 500);
  await hot(page, '#resChart1', 1.24);
  await say('plots-1');
  await page.waitForTimeout(PROBE ? 80 : 2000);
  await clearFilmHighlight(page);
}

async function influence(page, { mark, say }) {
  await loadFilm(page);
  mark();
  await page.evaluate(() => switchTab('diag-influence'));
  await page.waitForSelector('#resCooksChart', { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 60 : 450);
  await hot(page, '#resCooksChart', 1.08);
  await say('influence-1');
  await clearFilmHighlight(page);
  await page.click('.res-refit-btn');
  await page.waitForSelector('#resComparisonPanel', { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 60 : 400);
  const text = await page.locator('#resComparisonPanel').innerText();
  if (!text.includes('0.6930') || !text.includes('117')) {
    throw new Error(`Refit comparison is not the verified result: ${text.slice(0, 240)}`);
  }
  await page.evaluate(() => document.getElementById('resComparisonPanel')?.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(PROBE ? 40 : 300);
  await hot(page, '#resComparisonPanel', 1);
  await say('influence-2');
  await page.waitForTimeout(PROBE ? 80 : 2500);
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
  if (!fs.existsSync(path.join(WORK, 'reference.json'))) {
    throw new Error('Run validate-regression.mjs before capture. The reference file is missing.');
  }
  const server = serve();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  try {
    const jobs = [
      ['open', (page, api) => brand(page, 'open.html', 5, api)],
      ['overview', overview],
      ['coefficients', coefficients],
      ['scenario', scenario],
      ['plots', plots],
      ['influence', influence],
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
    fs.writeFileSync(path.join(WORK, 'scenes.json'), JSON.stringify(scenes, null, 2));
    console.log(JSON.stringify(scenes.map((scene) => ({ id: scene.id, trim: scene.trim, cues: scene.cues })), null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

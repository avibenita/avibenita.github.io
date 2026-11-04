import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire('e:/OneDrive/GitHub/statistico-analytics/package.json');
const { chromium } = require('playwright');

const ROOT = 'e:/OneDrive/GitHub';
const PRODUCE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(ROOT, 'Statistico/contingency/04_review/work');
const AUDIO = path.join(ROOT, 'Statistico/contingency/03_audio');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const PORT = 8765;
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
    const root = path.resolve(ROOT);
    if (!file.startsWith(root)) {
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
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}

function near(actual, expected, tol, label) {
  if (actual == null || Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(WORK, 'qa', `${name}.png`) });
}

async function stats(page) {
  return page.evaluate(() => {
    const b = window.__contingencyResult;
    if (!b || !b.analyzable) return { error: (b && b.error) || 'no bundle' };
    const m = b.measures2x2;
    return {
      title: b.datasetTitle || '',
      N: b.representedN,
      nRows: b.nRows,
      nCols: b.nCols,
      chi: b.tests.pearson.stat,
      df: b.tests.pearson.df,
      p: b.tests.pearson.p,
      v: b.tests.cramersV,
      warning: !!(b.diagnostics && b.diagnostics.assumptionWarning),
      minE: b.diagnostics && b.diagnostics.minExpected,
      fisher: b.tests.fisher && b.tests.fisher.available ? b.tests.fisher.p : null,
      or: m && m.oddsRatio && m.oddsRatio.available ? m.oddsRatio.value : null,
      rr: m && m.riskRatio && m.riskRatio.available ? m.riskRatio.value : null,
      rd: m && m.riskDifference && m.riskDifference.available ? m.riskDifference.value : null,
      group: m && m.layout ? m.layout.rowIndex : null,
      event: m && m.layout ? m.layout.colEvent : null,
      has2x2: !!m
    };
  });
}

async function openApp(page, example, tab) {
  const url = `${BASE}/statistico-analytics/dialogs/views/contingency/contingency-results.html?demo=1&example=${example}&tab=${tab}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const n = document.querySelector('#ctxN');
    const loading = document.querySelector('#loadingState');
    return n && n.textContent && n.textContent !== '—' && loading && getComputedStyle(loading).display === 'none';
  }, null, { timeout: 20000 });
  await page.waitForTimeout(PROBE ? 200 : 450);
}

async function hot(page, selector) {
  await page.evaluate((sel) => {
    document.querySelectorAll('.film-hot').forEach((el) => el.classList.remove('film-hot'));
    const el = sel ? document.querySelector(sel) : null;
    if (el) el.classList.add('film-hot');
  }, selector);
}

async function hotCell(page, row, col) {
  const ok = await page.evaluate(({ row, col }) => {
    document.querySelectorAll('.film-hot').forEach((el) => el.classList.remove('film-hot'));
    const label = (el) => (el && el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const heads = [...document.querySelectorAll('#tableWrap thead th')].map(label);
    const ci = heads.findIndex((h) => h === col.toLowerCase() || h.startsWith(col.toLowerCase()));
    const tr = [...document.querySelectorAll('#tableWrap tbody tr')].find((rowEl) => label(rowEl.querySelector('th')) === row.toLowerCase());
    const td = tr && ci > 0 ? tr.querySelectorAll('td')[ci - 1] : null;
    if (!td) return false;
    td.classList.add('film-hot');
    return true;
  }, { row, col });
  if (!ok) throw new Error(`Cell not found: ${row} × ${col}`);
}

async function park(page) {
  await page.mouse.move(12, 12);
}

async function takeaway(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('filmTakeaway');
    if (!t) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'filmTakeaway';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function clickMeasure(page, id) {
  const sel = `#measureBar .ws-mode-tab[data-m="${id}"]`;
  await hot(page, sel);
  await page.click(sel);
  await page.waitForTimeout(PROBE ? 80 : 280);
}

async function clickTab(page, tab) {
  const sel = `.sb-item[data-tab="${tab}"]`;
  await page.waitForSelector(sel, { timeout: 8000 });
  await hot(page, sel);
  await page.click(sel);
  await page.waitForTimeout(PROBE ? 120 : 350);
}

const FILM_CSS = `
  .film-hot { outline: 3px solid #7dd3fc !important; outline-offset: 3px; border-radius: 10px; }
  #filmTakeaway {
    position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%);
    z-index: 99999; max-width: 980px;
    background: rgba(7,17,28,.92);
    border: 1px solid rgba(120,200,255,.55);
    color: #fff; font: 700 26px/1.25 "Segoe UI", sans-serif;
    padding: 12px 22px; border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
    pointer-events: none;
  }
`;

async function recordScene(browser, name, run) {
  const context = await browser.newContext({
    viewport: { width: 1728, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: WORK, size: { width: 1728, height: 1080 } }
  });
  await context.addInitScript((css) => {
    const add = () => {
      if (document.getElementById('filmCss')) return;
      const style = document.createElement('style');
      style.id = 'filmCss';
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add);
    const timer = setInterval(() => {
      if (!window.Highcharts) return;
      window.Highcharts.setOptions({
        chart: { animation: false },
        plotOptions: { series: { animation: false }, column: { animation: false } }
      });
      clearInterval(timer);
    }, 30);
  }, FILM_CSS);
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
  try {
    await run(page, { mark, note, say });
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
  fs.copyFileSync(src, dest);
  fs.unlinkSync(src);
  return { id: name, src: dest, trim: Math.max(0, (useful - t0) / 1000), cues };
}

async function orient(page, { mark, say }) {
  await openApp(page, 'programme', 'table');
  const s = await stats(page);
  near(s.N, 120, 0.01, 'programme N');
  near(s.chi, 5, 0.001, 'programme chi');
  near(s.rr, 1.4, 0.001, 'programme RR');
  if (s.title !== 'Simulated programme completion') throw new Error(`title ${s.title}`);
  await page.waitForSelector('.sb-item[data-tab="twobytwo"]');
  mark();
  await hot(page, '#sidebarNav');
  await say('orient-1');
  const slice = Math.max(PROBE ? 0.25 : 1.7, dur('orient-2') / 4);
  const speech = say('orient-2');
  for (const tab of ['overview', 'table', 'diagnostics', 'twobytwo']) {
    await clickTab(page, tab);
    if (tab === 'diagnostics') {
      await page.waitForFunction(() => !!document.querySelector('#vizChart .highcharts-series, #vizChart .highcharts-root'), null, { timeout: 8000 }).catch(() => {});
    }
    await page.waitForTimeout(slice * 1000);
  }
  await speech;
  await clickTab(page, 'table');
  await hot(page, '#measureBar');
  await park(page);
  await say('orient-3');
  await page.waitForTimeout(PROBE ? 150 : 800);
}

async function percent(page, { mark, say }) {
  await openApp(page, 'programme', 'table');
  mark();
  await hot(page, '#measureBar');
  await say('count-1');
  await page.waitForTimeout(PROBE ? 80 : 350);
  await clickMeasure(page, 'rowPct');
  await clickMeasure(page, 'observed');
  await clickMeasure(page, 'observed');
  await hot(page, '#tableWrap');
  await park(page);
  await say('count-2');
  await page.waitForTimeout(PROBE ? 100 : 2200);
  await clickMeasure(page, 'colPct');
  await clickMeasure(page, 'rowPct');
  await clickMeasure(page, 'observed');
  await say('count-3');
  await page.waitForTimeout(PROBE ? 100 : 1400);
  await clickMeasure(page, 'rowPct');
  await clickMeasure(page, 'colPct');
  await clickMeasure(page, 'observed');
  await park(page);
  await takeaway(page, 'Choose the denominator that matches your question.');
  await page.waitForTimeout(PROBE ? 200 : 2600);
  await takeaway(page, '');
}

async function twobytwo(page, { mark, say }) {
  await openApp(page, 'programme', 'twobytwo');
  await page.waitForSelector('#selRowIndex');
  const s = await stats(page);
  if (s.group !== 'Programme A' || s.event !== 'Completed') throw new Error(`mapping ${s.group} / ${s.event}`);
  near(s.rr, 1.4, 0.001, 'RR A');
  near(s.or, 2.333333, 0.01, 'OR A');
  near(s.rd, 0.2, 0.001, 'RD A');
  mark();
  await hot(page, '#selRowIndex');
  await say('two-1');
  await page.waitForTimeout(PROBE ? 80 : 700);
  await page.selectOption('#selRowIndex', 'Programme B');
  await page.waitForTimeout(PROBE ? 120 : 500);
  const flipped = await stats(page);
  if (flipped.group !== 'Programme B' || flipped.event !== 'Completed') throw new Error(`flipped mapping ${flipped.group}`);
  near(flipped.rr, 0.714286, 0.002, 'RR B');
  near(flipped.or, 0.428571, 0.002, 'OR B');
  near(flipped.rd, -0.2, 0.001, 'RD B');
  await hot(page, '#rrKpis');
  await park(page);
  await page.waitForTimeout(PROBE ? 150 : 2400);
  await say('two-2');
  await page.selectOption('#selRowIndex', 'Programme A');
  await page.waitForTimeout(PROBE ? 120 : 500);
  const back = await stats(page);
  if (back.group !== 'Programme A') throw new Error('did not restore Programme A');
  near(back.rr, 1.4, 0.001, 'RR restored');
  await page.waitForTimeout(PROBE ? 100 : 1200);
}

async function segments(page, { mark, say }) {
  await openApp(page, 'satisfaction', 'table');
  const s = await stats(page);
  near(s.N, 180, 0.01, 'segment N');
  near(s.chi, 18, 0.001, 'segment chi');
  near(s.v, 0.223607, 0.001, 'Cramer V');
  if (s.has2x2) throw new Error('3x3 still has 2x2 measures');
  if (await page.locator('.sb-item[data-tab="twobytwo"]').count()) throw new Error('3x3 still shows 2x2 navigation');
  if (s.title !== 'Simulated segment × satisfaction') throw new Error(s.title);
  mark();
  await hot(page, '#ctxTitle');
  await say('seg-1');
  await clickTab(page, 'overview');
  await park(page);
  const half = dur('seg-2') * (PROBE ? 0.2 : 0.46);
  const pending = say('seg-2');
  await page.waitForTimeout(half * 1000);
  await clickTab(page, 'diagnostics');
  await page.evaluate(() => {
    const wrap = document.getElementById('vizChartWrap');
    const card = wrap && wrap.closest('.card');
    if (card) card.style.display = 'none';
    const el = document.getElementById('diagKpis');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await pending;
  await takeaway(page, 'Test association. Assess magnitude. Check expected counts.');
  await page.waitForTimeout(PROBE ? 200 : 2800);
  await takeaway(page, '');
}

async function pattern(page, { mark, note, say }) {
  await openApp(page, 'satisfaction', 'table');
  mark();
  await clickMeasure(page, 'expected');
  await page.selectOption('#colorMetricSel', 'stdResiduals');
  await page.waitForTimeout(PROBE ? 80 : 300);
  await hotCell(page, 'Basic', 'Low');
  await park(page);
  const pat = dur('pat-1');
  note('pat-1');
  const pendingPat = page.waitForTimeout(pat * 1000);
  await page.waitForTimeout(pat * (PROBE ? 0.45 : 0.62) * 1000);
  await hotCell(page, 'Premium', 'High');
  await pendingPat;
  await clickTab(page, 'diagnostics');
  await page.selectOption('#vizMetric', 'rowPct');
  await page.selectOption('#vizType', 'column-pct');
  await page.selectOption('#vizAxis', 'row');
  await page.waitForFunction(() => {
    const point = document.querySelector('#vizChart .highcharts-point');
    if (!point) return false;
    return point.getBoundingClientRect().height > 20;
  }, null, { timeout: 8000 });
  await page.evaluate(() => {
    const scroller = document.querySelector('.results-container');
    const card = document.getElementById('vizChartWrap') && document.getElementById('vizChartWrap').closest('.card');
    if (scroller && card) {
      const top = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = Math.max(0, top - 8);
    }
    if (window.Highcharts && Highcharts.charts) {
      Highcharts.charts.forEach((chart) => { if (chart && chart.reflow) chart.reflow(); });
    }
  });
  await page.waitForTimeout(PROBE ? 200 : 700);
  await hot(page, '#vizType');
  await park(page);
  await say('pat-2');
  await page.waitForTimeout(PROBE ? 150 : 2200);
}

async function sparse(page, { mark, say }) {
  await openApp(page, 'sparse2x2', 'overview');
  const s = await stats(page);
  near(s.N, 10, 0.01, 'sparse N');
  near(s.minE, 2.5, 0.001, 'sparse E');
  near(s.fisher, 0.206349, 0.001, 'Fisher p');
  if (!s.warning) throw new Error('sparse table did not warn about expected counts');
  mark();
  await page.evaluate(() => {
    const el = document.getElementById('testsWrap');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await hot(page, '#testsWrap');
  await park(page);
  await say('sparse-1');
  await page.waitForTimeout(PROBE ? 200 : 2600);
}

async function brand(page, file, seconds, { mark }) {
  await page.goto(`${BASE}/Statistico/contingency/produce/${file}`, { waitUntil: 'load' });
  await page.evaluate(() => document.body.classList.add('go'));
  mark();
  await page.waitForTimeout((PROBE ? Math.min(seconds, 0.8) : seconds) * 1000);
}

async function main() {
  const server = serve();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  const checks = [];
  const wanted = new Set(process.argv.slice(2).filter((arg) => arg !== 'probe'));
  try {
    const jobs = [
      ['open', (page, api) => brand(page, 'open.html', 4, api)],
      ['orient', orient],
      ['percent', percent],
      ['twobytwo', twobytwo],
      ['segments', segments],
      ['pattern', pattern],
      ['sparse', sparse],
      ['card1', (page, api) => brand(page, 'cards.html?card=1', 25, api)],
      ['card2', (page, api) => brand(page, 'cards.html?card=2', 19, api)],
      ['bridge', (page, api) => brand(page, 'bridge.html', 1.2, api)],
      ['thanks', async (page, api) => {
        await page.goto(`${BASE}/Statistico/contingency/produce/thanks.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 120 : 420);
        await api.say('thanks-1');
        await page.waitForTimeout(PROBE ? 120 : 750);
      }],
      ['close', async (page, api) => {
        await page.goto(`${BASE}/Statistico/contingency/produce/close.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 200 : 450);
        await api.say('close-1');
        await page.waitForTimeout(PROBE ? 200 : 1100);
      }]
    ].filter(([name]) => !wanted.size || wanted.has(name));
    for (const [name, fn] of jobs) {
      process.stdout.write(`scene ${name}\n`);
      scenes.push(await recordScene(browser, name, fn));
    }
    if (!wanted.size) {
      const group = await browser.newPage({ viewport: { width: 1728, height: 1080 } });
      await group.goto(`${BASE}/statistico-analytics/dialogs/views/contingency/by-group.html?demo=1`, { waitUntil: 'domcontentloaded' });
      await group.waitForTimeout(1800);
      await group.screenshot({ path: path.join(WORK, 'qa', 'by-group.png') });
      checks.push({ byGroup: (await group.locator('body').innerText()).slice(0, 400) });
      await group.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  const scenePath = path.join(WORK, 'scenes.json');
  const order = ['open', 'orient', 'percent', 'twobytwo', 'segments', 'pattern', 'sparse', 'card1', 'card2', 'bridge', 'thanks', 'close'];
  let previous = [];
  try { previous = JSON.parse(fs.readFileSync(scenePath, 'utf8')); } catch { previous = []; }
  const byId = new Map(previous.map((scene) => [scene.id, scene]));
  for (const scene of scenes) byId.set(scene.id, scene);
  const merged = order.map((id) => byId.get(id)).filter(Boolean);
  fs.writeFileSync(scenePath, JSON.stringify(merged, null, 2));
  fs.writeFileSync(path.join(WORK, 'checks.json'), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(scenes.map((s) => ({ id: s.id, trim: s.trim, cues: s.cues })), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

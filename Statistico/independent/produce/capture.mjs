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
const WORK = path.join(ROOT, 'Statistico/independent/04_review/work');
const AUDIO = path.join(ROOT, 'Statistico/independent/03_audio');
const FFMPEG = process.env.FFMPEG || 'C:/Users/Avi Benita/AppData/Local/Programs/Python/Python314/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe';
const PORT = 8771;
const BASE = `http://127.0.0.1:${PORT}`;
const PROBE = process.argv.includes('probe');
const NUMBERS = process.argv.includes('numbers');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'Statistico/independent/01_source/fixtures.json'), 'utf8'));

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
        '.json': 'application/json',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}

function near(actual, expected, tol, label) {
  const n = Number(String(actual).replace(/[^\d.+-]/g, ''));
  if (!Number.isFinite(n) || Math.abs(n - expected) > tol) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(WORK, 'qa', `${name}.png`) });
}

async function hot(page, selector) {
  await page.evaluate((sel) => {
    document.querySelectorAll('.film-hot').forEach((el) => el.classList.remove('film-hot'));
    const el = sel ? document.querySelector(sel) : null;
    if (el) el.classList.add('film-hot');
  }, selector);
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

async function clickTab(page, tab) {
  const sel = `.sb-item[data-tab="${tab}"]`;
  await page.waitForSelector(sel, { timeout: 8000 });
  await hot(page, sel);
  await page.click(sel);
  await page.waitForTimeout(PROBE ? 120 : 420);
  await park(page);
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

async function loadFilm(page) {
  await page.goto(`${BASE}/statistico-analytics/dialogs/views/independent/independent-results.html?demo=1&embed=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForFunction(() => typeof window.populateBundle === 'function' && !!document.querySelector('#sidebarNav'), null, { timeout: 25000 });
  await page.addScriptTag({ url: `${BASE}/statistico-analytics/taskpane/independent/independent-contract.js` });
  await page.addScriptTag({ url: `${BASE}/statistico-analytics/taskpane/independent/independent-input-panel.js` });
  const shown = await page.evaluate((fixture) => {
    const bundle = buildIndependentBundle(fixture.headers, fixture.rows, fixture.spec);
    const raw = [fixture.headers].concat(fixture.rows);
    window.__filmBundle = bundle;
    window.__filmRaw = raw;
    window.__filmLock = true;
    const real = window.populateBundle;
    window.populateBundle = function () {
      window.independentRangeData = window.__filmRaw;
      window.independentAnalysisRows = window.__filmRaw;
      return real(window.__filmBundle);
    };
    window.independentRangeData = raw;
    window.independentAnalysisRows = raw;
    real(bundle);
    if (window.StatisticoHeader && StatisticoHeader.updateTitle) StatisticoHeader.updateTitle(fixture.title);
    return {
      stat: (document.getElementById('resPrimaryStat') || {}).textContent || '',
      p: (document.getElementById('resPrimaryP') || {}).textContent || '',
      est: (document.getElementById('resPrimaryEstimate') || {}).textContent || '',
      g: (document.getElementById('resEffectSize') || {}).textContent || '',
      decision: (document.getElementById('resDecision') || {}).textContent || '',
      design: (document.getElementById('designMessageRow') || {}).textContent || '',
      chips: (document.getElementById('compareStatsRow') || {}).textContent || '',
      eq: (document.getElementById('asEqVar') || {}).textContent || '',
      normA: (document.getElementById('asNormA') || {}).textContent || '',
      test: (document.getElementById('resPrimaryTest') || {}).textContent || '',
      u: (document.getElementById('resSecondaryStat') || {}).textContent || '',
      rrb: (document.getElementById('resRankBiserial') || {}).textContent || '',
      engine: {
        t: bundle.results.welchT,
        df: bundle.results.welchDf,
        p: bundle.results.welchP,
        diff: bundle.results.meanDiff,
        lo: bundle.results.ciLow,
        hi: bundle.results.ciHigh,
        g: bundle.effects.hedgesG,
        eta: bundle.effects.etaSquared,
        u: bundle.results.u,
        mwP: bundle.results.mwP,
        rrb: bundle.effects.rankBiserial,
        se: bundle.results.welchSe,
        design: bundle.setup.designValidation && bundle.setup.designValidation.status
      }
    };
  }, FIXTURE);
  await page.waitForTimeout(PROBE || NUMBERS ? 250 : 600);
  if (shown.engine.design !== 'independent') throw new Error(`design ${shown.engine.design}: ${shown.design}`);
  near(shown.engine.diff, -6, 1e-4, 'A minus B');
  near(shown.engine.t, -2.32379, 1e-4, 'Welch t');
  near(shown.engine.df, 58, 1e-4, 'Welch df');
  near(shown.engine.p, 0.02366221481, 1e-6, 'Welch t p');
  near(shown.engine.lo, -11.16841240, 1e-4, 'Welch CI low');
  near(shown.engine.hi, -0.8315877291, 1e-4, 'Welch CI high');
  near(shown.engine.g, -0.5922078, 1e-4, 'Hedges g');
  near(shown.engine.eta, 0.0851735016, 1e-6, 'observed eta-squared');
  near(shown.engine.u, 309, 1e-6, 'Mann-Whitney U');
  near(shown.engine.mwP, 0.03710526255, 2e-5, 'Mann-Whitney p');
  return shown;
}

async function readPower(page) {
  return page.evaluate(() => ({
    power: (document.getElementById('powObserved') || {}).textContent || '',
    req: (document.getElementById('powRequired') || {}).textContent || '',
    f: (document.getElementById('powEffectSize') || {}).textContent || '',
    eta: (document.getElementById('pwstd-assume-effect') || {}).value || '',
    obs: (document.getElementById('pwstd-assume-obs') || {}).textContent || '',
    n: (document.getElementById('powSampleSize') || {}).textContent || '',
    alpha: (document.getElementById('powAlpha') || {}).textContent || '',
    label: (document.getElementById('pwstd-hero-req-label') || {}).textContent || '',
    note: (document.getElementById('powEngineNote') || {}).textContent || '',
    summary: (document.getElementById('pwstd-planning-summary') || {}).textContent || '',
    groups: (document.getElementById('pwstd-assume-p') || {}).textContent || ''
  }));
}

async function setEta(page, value) {
  const input = page.locator('#pwstd-assume-effect');
  await input.fill(String(value));
  await input.dispatchEvent('change');
  await page.waitForTimeout(PROBE ? 80 : 450);
}

async function selectPower(page, pct) {
  await page.click(`.pwstd-chip[data-pct="${pct}"]`);
  await page.waitForTimeout(PROBE ? 80 : 350);
}

const UI = {};

async function orient(page, { mark, say }) {
  await loadFilm(page);
  Object.assign(UI, { loaded: true });
  mark();
  await hot(page, '#compareStatsRow');
  await park(page);
  await say('orient-1');
  await hot(page, '#sidebarNav');
  const speech = say('orient-2');
  const slice = Math.max(PROBE ? 0.2 : 1.15, dur('orient-2') / 5);
  for (const tab of ['explore', 'assumptions', 'results', 'effects', 'power']) {
    await clickTab(page, tab);
    await page.waitForTimeout(slice * 1000);
  }
  await speech;
  await clickTab(page, 'explore');
  await hot(page, '#xp-desc-table');
  await park(page);
  await say('orient-3');
  await page.waitForTimeout(PROBE ? 120 : 700);
}

async function groups(page, { mark, say }) {
  await loadFilm(page);
  await clickTab(page, 'explore');
  mark();
  await hot(page, '#desc-stats-table');
  await park(page);
  await say('group-1');
  await clickTab(page, 'results');
  await page.click('input[name="chartMetric"][value="boxplot"]');
  await page.waitForFunction(() => !!document.querySelector('#groupChart .highcharts-boxplot-series, #groupChart .highcharts-series'), null, { timeout: 8000 });
  await page.waitForTimeout(PROBE ? 120 : 400);
  await hot(page, '#groupChart');
  await park(page);
  await say('group-2');
  await takeaway(page, 'Compare spread as well as averages.');
  await page.waitForTimeout(PROBE ? 150 : 2200);
}

async function assumptions(page, { mark, say }) {
  await loadFilm(page);
  mark();
  await hot(page, '#resPrimaryTest');
  await park(page);
  await say('assume-1');
  await clickTab(page, 'assumptions');
  await hot(page, '#tab-assumptions .stat-panel');
  await park(page);
  await say('assume-2');
  await page.waitForTimeout(PROBE ? 120 : 800);
}

async function result(page, { mark, say }) {
  await loadFilm(page);
  await clickTab(page, 'results');
  await page.waitForFunction(() => !!document.querySelector('#groupChart .highcharts-series'), null, { timeout: 8000 });
  mark();
  await hot(page, '#resPrimaryEstimate');
  await park(page);
  await say('result-1');
  await page.waitForTimeout(PROBE ? 80 : 400);
  await hot(page, '#resEffectSize');
  await say('result-2');
  await page.waitForTimeout(PROBE ? 120 : 900);
}

async function power(page, { mark, say }) {
  await loadFilm(page);
  await clickTab(page, 'power');
  await page.waitForSelector('#pwstd-assume-effect', { timeout: 8000 });
  await selectPower(page, '80');
  await setEta(page, '0.083');
  const planned = await readPower(page);
  if (!planned.req || planned.req === '—') throw new Error(`power did not solve: ${JSON.stringify(planned)}`);
  mark();
  await hot(page, '#pwstd-hero');
  await park(page);
  await say('power-1');
  await setEta(page, '0.038');
  await hot(page, '#powRequired');
  await say('power-2');
  await setEta(page, '0.083');
  await hot(page, '#powObserved');
  await park(page);
  await say('power-3');
  await page.waitForTimeout(PROBE ? 120 : 900);
}

async function rank(page, { mark, say }) {
  await loadFilm(page);
  await clickTab(page, 'results');
  mark();
  await hot(page, '#fwFrameworkBtn');
  await page.click('#fwFrameworkBtn');
  await page.waitForTimeout(PROBE ? 80 : 280);
  await page.click('#fwFrameworkMenu .fw-select-option[data-value="nonparametric"]');
  await page.waitForTimeout(PROBE ? 120 : 450);
  await hot(page, '#resPrimaryTest');
  await park(page);
  await say('rank-1');
  await page.waitForTimeout(PROBE ? 80 : 500);
  await page.click('#fwFrameworkBtn');
  await page.waitForTimeout(120);
  await page.click('#fwFrameworkMenu .fw-select-option[data-value="parametric"]');
  await page.waitForTimeout(PROBE ? 80 : 400);
  await hot(page, '#resPrimaryTest');
  await park(page);
  await page.waitForTimeout(PROBE ? 80 : 700);
}

async function brand(page, file, seconds, { mark }) {
  await page.goto(`${BASE}/Statistico/independent/produce/${file}`, { waitUntil: 'load' });
  await page.evaluate(() => document.body.classList.add('go'));
  mark();
  await page.waitForTimeout((PROBE ? Math.min(seconds, 0.8) : seconds) * 1000);
}

async function routeCharts(context) {
  const vendor = path.join(ROOT, 'statistico-analytics/dialogs/views/shared/vendor/highcharts');
  await context.route('https://code.highcharts.com/**', async (route) => {
    const url = route.request().url();
    const file = url.includes('highcharts-more') ? 'highcharts-more.js' : 'highcharts.js';
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
        plotOptions: { series: { animation: false }, column: { animation: false }, boxplot: { animation: false } }
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
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.copyFileSync(src, dest);
  try { fs.unlinkSync(src); } catch (_e) {}
  return { id: name, src: dest.replace(/\\/g, '/'), trim: Math.max(0, (useful - t0) / 1000), cues };
}

async function dumpNumbers(browser) {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1080 } });
  const shown = await loadFilm(page);
  await clickTab(page, 'power');
  await page.waitForSelector('#pwstd-assume-effect', { timeout: 8000 });
  await selectPower(page, '80');
  const observed = await readPower(page);
  await setEta(page, '0.083');
  const d60 = await readPower(page);
  await setEta(page, '0.038');
  const d40 = await readPower(page);
  await setEta(page, '0.083');
  const back = await readPower(page);
  await clickTab(page, 'results');
  await page.evaluate(() => {
    const el = document.getElementById('setAlpha');
    el.value = '0.01';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const alpha01 = await page.evaluate(() => ({
    p: document.getElementById('resPrimaryP').textContent,
    est: document.getElementById('resPrimaryEstimate').textContent,
    label: document.getElementById('resPrimaryEstimateLabel').textContent
  }));
  if (!/0\.0237/.test(alpha01.p)) throw new Error(`alpha .01 changed the Welch p: ${alpha01.p}`);
  const upper = Number((alpha01.est.match(/,\s*([+-]?\d+(?:\.\d+)?)\]/) || [])[1]);
  if (!(upper > -0.2)) throw new Error(`alpha .01 did not widen the interval: ${alpha01.est}`);
  if (!/99%/.test(alpha01.label)) throw new Error(`interval label stayed at the old confidence: ${alpha01.label}`);
  if (String(d60.req) !== '90') throw new Error(`eta .083 required N ${d60.req}, expected balanced 90`);
  if (String(d40.req) !== '202') throw new Error(`eta .038 required N ${d40.req}, expected balanced 202`);
  await page.evaluate(() => {
    const el = document.getElementById('setAlpha');
    el.value = '0.05';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(200);
  await page.click('#fwFrameworkBtn');
  await page.click('#fwFrameworkMenu .fw-select-option[data-value="nonparametric"]');
  await page.waitForTimeout(300);
  const mw = await page.evaluate(() => ({
    test: document.getElementById('resPrimaryTest').textContent,
    stat: document.getElementById('resPrimaryStat').textContent,
    p: document.getElementById('resPrimaryP').textContent,
    est: document.getElementById('resPrimaryEstimate').textContent,
    effect: document.getElementById('resEffectSize').textContent
  }));
  const tools = await page.evaluate(() => ({
    ai: !!document.getElementById('sbAiBtn') && document.getElementById('sbAiBtn').textContent.replace(/\s+/g, ' ').trim(),
    explain: !!document.getElementById('sbAiFloatBtn'),
    html: document.getElementById('sbExportHtmlBtn') ? !document.getElementById('sbExportHtmlBtn').disabled : false,
    json: document.getElementById('sbExportJsonBtn') ? !document.getElementById('sbExportJsonBtn').disabled : false,
    view: document.getElementById('sbViewDataBtn') ? !document.getElementById('sbViewDataBtn').disabled : false,
    png: !!document.getElementById('sbSavePngBtn'),
    testOptions: [...document.querySelectorAll('#setPrimaryTest option')].map((o) => o.textContent)
  }));
  await shot(page, 'numbers-mw');
  const report = { shown, observed, d60, d40, back, mw, alpha01, tools };
  fs.writeFileSync(path.join(WORK, 'numbers.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
}

async function main() {
  const server = serve();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const scenes = [];
  try {
    if (NUMBERS) {
      await dumpNumbers(browser);
      return;
    }
    const jobs = [
      ['open', (page, api) => brand(page, 'open.html', 4.2, api)],
      ['orient', orient],
      ['groups', groups],
      ['assumptions', assumptions],
      ['result', result],
      ['power', power],
      ['rank', rank],
      ['card1', (page, api) => brand(page, 'cards.html?card=1', 25, api)],
      ['card2', (page, api) => brand(page, 'cards.html?card=2', 19, api)],
      ['bridge', (page, api) => brand(page, 'bridge.html', 1.2, api)],
      ['thanks', async (page, api) => {
        await page.goto(`${BASE}/Statistico/independent/produce/thanks.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 120 : 420);
        await api.say('thanks-1');
        await page.waitForTimeout(PROBE ? 120 : 750);
      }],
      ['close', async (page, api) => {
        await page.goto(`${BASE}/Statistico/independent/produce/close.html`, { waitUntil: 'load' });
        await page.evaluate(() => document.body.classList.add('go'));
        api.mark();
        await page.waitForTimeout(PROBE ? 200 : 450);
        await api.say('close-1');
        await page.waitForTimeout(PROBE ? 200 : 1100);
      }]
    ];
    const wanted = new Set(process.argv.slice(2).filter((arg) => arg !== 'probe' && arg !== 'numbers'));
    for (const [name, fn] of jobs.filter(([name]) => !wanted.size || wanted.has(name))) {
      process.stdout.write(`scene ${name}\n`);
      scenes.push(await recordScene(browser, name, fn));
    }
    let merged = scenes;
    if (wanted.size) {
      const prior = JSON.parse(fs.readFileSync(path.join(WORK, 'scenes.json'), 'utf8'));
      const fresh = Object.fromEntries(scenes.map((scene) => [scene.id, scene]));
      merged = prior.map((scene) => fresh[scene.id] || scene);
    }
    fs.writeFileSync(path.join(WORK, 'scenes.json'), JSON.stringify(merged, null, 2));
    console.log(JSON.stringify(scenes, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire('e:/OneDrive/GitHub/statistico-analytics/package.json');
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORK = path.join(ROOT, 'Statistico/regression/04_review/work');
const PORT = 8776;
const BASE = `http://127.0.0.1:${PORT}`;

function createDemo() {
  let seed = 20260812;
  function rnd() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0xFFFFFFFF;
  }
  function normal(mean, sd) {
    const u1 = Math.max(1e-10, rnd());
    const u2 = rnd();
    return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  const headers = ['Sales', 'Ad Spend', 'Store Size', 'Region'];
  const regions = ['North', 'South', 'West'];
  const rows = [];
  for (let i = 0; i < 120; i += 1) {
    const ad = Math.max(5, normal(40, 15));
    const size = Math.max(800, normal(2200, 500));
    const region = regions[Math.floor(rnd() * regions.length)];
    const regionEffect = region === 'North' ? 8 : (region === 'South' ? 0 : 4);
    const sales = Math.max(10, 20 + 1.8 * ad + 0.012 * size + regionEffect + normal(0, 18));
    rows.push([
      Math.round(sales * 10) / 10,
      Math.round(ad * 10) / 10,
      Math.round(size),
      region
    ]);
  }
  return { headers, rows };
}

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
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function near(failures, label, actual, expected, tol) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tol) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

function formatLikePage(val) {
  if (Math.abs(val) < 0.01 && val !== 0) return val.toExponential(3);
  if (Math.abs(val) < 1 && val !== 0) return val.toFixed(4);
  return val.toFixed(2);
}

function formatP(val) {
  return val < 0.0001 ? '< 0.0001' : val.toFixed(4);
}

const failures = [];
const limits = [];
const demo = createDemo();
fs.mkdirSync(WORK, { recursive: true });
const server = serve();
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1080 } });
  const vendor = path.join(ROOT, 'statistico-analytics/dialogs/views/shared/vendor/highcharts');
  await page.route('https://code.highcharts.com/**', async (route) => {
    const url = route.request().url();
    const file = url.includes('exporting')
      ? 'modules/exporting.js'
      : url.includes('highcharts-more') ? 'highcharts-more.js' : 'highcharts.js';
    await route.fulfill({ path: path.join(vendor, file), contentType: 'text/javascript' });
  });
  await page.goto(`${BASE}/statistico-analytics/dialogs/views/regression/regression-coefficients.html?demo=1&embed=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });
  await page.waitForFunction(() => {
    const el = document.getElementById('kpiRSquared');
    const overlay = document.getElementById('loadingOverlay');
    return el && /%/.test(el.textContent || '') && overlay && overlay.classList.contains('hidden');
  }, null, { timeout: 25000 });
  const pageData = await page.evaluate(() => ({
    headers: window.globalRawHeaders,
    rows: window.globalRawRows,
    results: window.regressionResults,
    kpiN: document.getElementById('kpiN').textContent,
    kpiR2: document.getElementById('kpiRSquared').textContent,
    kpiFp: document.getElementById('kpiFPValue').textContent,
    verdict: document.getElementById('conclusionVerdict').textContent,
    table: [...document.querySelectorAll('#dataTableBody tr')].map((tr) => [...tr.cells].map((td) => td.textContent.replace(/\s+/g, ' ').trim()))
  }));
  if (JSON.stringify(pageData.rows) !== JSON.stringify(demo.rows)) {
    failures.push('The page rows do not match the seeded demo worker (seed 20260812).');
  }
  const rowsFile = path.join(WORK, 'rows.json');
  fs.writeFileSync(rowsFile, JSON.stringify({ headers: pageData.headers, rows: pageData.rows }));
  const py = spawnSync('py', ['-3', path.join(ROOT, 'Statistico/video-workflow/regression-reference.py'), rowsFile], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  if (py.status !== 0) {
    failures.push(`Independent reference failed.\n${(py.stderr || py.stdout).slice(-1500)}`);
  } else {
    const ref = JSON.parse(py.stdout);
    const shown = pageData.results;
    near(failures, 'n', shown.n, ref.n, 0);
    near(failures, 'R2', shown.R2, ref.r2, 1e-9);
    near(failures, 'adj R2', shown.R2_adj, ref.r2_adj, 1e-9);
    near(failures, 'RMSE', shown.RMSE, ref.rmse, 1e-8);
    near(failures, 'F', shown.F_stat, ref.f, 1e-8);
    if (!(ref.f_p < 0.0001)) failures.push(`independent F p is not below 0.0001: ${ref.f_p}`);
    ref.coefficients.forEach((value, i) => {
      near(failures, `${ref.names[i]} coefficient`, shown.coefficients[i], value, 1e-8);
      near(failures, `${ref.names[i]} SE`, shown.std_errors[i], ref.se[i], 1e-8);
      near(failures, `${ref.names[i]} t`, shown.t_values[i], ref.t[i], 1e-6);
      near(failures, `${ref.names[i]} CI low`, shown.CI_lower[i], ref.ci_low[i], 1e-6);
      near(failures, `${ref.names[i]} CI high`, shown.CI_upper[i], ref.ci_high[i], 1e-6);
    });
    if (pageData.kpiN !== '120') failures.push(`n display ${pageData.kpiN}`);
    if (pageData.kpiR2 !== '65.63%') failures.push(`R² display ${pageData.kpiR2}`);
    if (!pageData.verdict.includes('< 0.0001')) failures.push(`conclusion does not show p < 0.0001: ${pageData.verdict}`);
    if (pageData.kpiFp !== '< 0.0001') {
      limits.push(`Overview F-test chip shows "${pageData.kpiFp}" while the conclusion text is below 0.0001. Deferred to the validation project. Not featured.`);
    }
    const ad = pageData.table.find((row) => row[0] === 'Ad Spend');
    if (!ad) failures.push('Ad Spend row is missing');
    else {
      const expected = [
        'Ad Spend',
        formatLikePage(ref.coefficients[1]),
        formatLikePage(ref.se[1]),
        ref.t[1].toFixed(2),
        formatP(ref.p[1]),
        formatLikePage(ref.ci_low[1]),
        formatLikePage(ref.ci_high[1])
      ];
      expected.forEach((text, index) => {
        if (index === 0) return;
        if (!String(ad[index] || '').includes(text)) failures.push(`Ad Spend column ${index} shows "${ad[index]}", expected to include ${text}`);
      });
      if (ad[7] !== '—') limits.push(`VIF cell shows "${ad[7]}" because computeOLS is called without the VIF flag. Deferred. Not featured.`);
    }
    await page.evaluate(() => switchTab('results-detail'));
    const fPanel = await page.textContent('#fPValue');
    if (!String(fPanel).includes('< 0.0001')) failures.push(`F panel p is ${fPanel}`);
    await page.evaluate(() => switchTab('pred-scenario'));
    await page.waitForFunction(() => document.getElementById('predictedValue') && document.getElementById('predictedValue').textContent !== '-', null, { timeout: 8000 });
    const startPred = await page.evaluate(() => ({
      value: document.getElementById('predictedValue').textContent,
      ad: document.getElementById('input-Ad Spend').value,
      region: document.getElementById('input-Region').value
    }));
    await page.evaluate(() => {
      const slider = document.getElementById('input-Ad Spend');
      slider.value = slider.max;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    const endPred = await page.evaluate(() => ({
      value: document.getElementById('predictedValue').textContent,
      ad: document.getElementById('value-Ad Spend').textContent
    }));
    const deltaShown = Number(endPred.value) - Number(startPred.value);
    const deltaSlope = ref.coefficients[1] * (Number(endPred.ad) - Number(startPred.ad));
    near(failures, 'scenario change equals Ad Spend slope', deltaShown, deltaSlope, 0.03);
    if (startPred.region === 'West') {
      limits.push('Scenario region control opens on West while the linear predictor uses the North reference. Deferred. The film does not use the region control.');
    }
    await page.evaluate(() => switchTab('diag-influence'));
    await page.waitForSelector('.res-refit-btn', { timeout: 8000 });
    const flagged = await page.evaluate(() => (window._resInfluentialIndices || []).map((i) => i + 1).sort((a, b) => a - b));
    if (JSON.stringify(flagged) !== JSON.stringify(ref.flagged_rows)) {
      failures.push(`flagged rows ${flagged.join(',')} expected ${ref.flagged_rows.join(',')}`);
    }
    await page.click('.res-refit-btn');
    await page.waitForTimeout(300);
    const comparison = await page.locator('#resComparisonPanel').innerText();
    const refitR2 = ref.refit.r2.toFixed(4);
    const refitRmse = ref.refit.rmse.toFixed(4);
    if (!comparison.includes(refitR2)) failures.push(`refit panel missing R² ${refitR2}: ${comparison.slice(0, 300)}`);
    if (!comparison.includes(refitRmse)) failures.push(`refit panel missing RMSE ${refitRmse}`);
    if (!comparison.includes(String(ref.refit.n))) failures.push(`refit panel missing n ${ref.refit.n}`);
    limits.push(`Shapiro-Wilk and Breusch-Pagan cards are random draws. An outside Shapiro-Wilk on these residuals is W ${ref.limits.shapiro_w.toFixed(4)}, p ${ref.limits.shapiro_p.toFixed(4)}. Deferred. Not featured.`);
    limits.push(`Durbin-Watson on the page drops the first squared residual. The outside statistic is ${ref.limits.durbin_watson.toFixed(4)}. Deferred. Not featured.`);
    limits.push(`Cook's distance on screen uses leverage k/n for every row (page maximum about ${ref.limits.max_page_formula_cooks.toFixed(4)}). Classical hat-value Cook's distance has maximum ${ref.limits.max_classical_cooks.toFixed(4)}. Deferred. The film uses the flagged rows and the refit, and does not describe Cook's distance.`);
    limits.push('Scenario interval widths use 0.3×RMSE and 1.1×RMSE with t = 1.96. They are not classical standard errors. Deferred. The film does not describe those widths.');
    const report = {
      ok: failures.length === 0,
      reference: ref,
      display: {
        n: pageData.kpiN,
        r2: pageData.kpiR2,
        adSpend: ad,
        scenarioFrom: startPred.value,
        scenarioTo: endPred.value,
        refitR2,
        refitRmse,
        refitN: ref.refit.n
      },
      limitations: limits
    };
    fs.writeFileSync(path.join(WORK, 'reference.json'), JSON.stringify(report, null, 2));
  }
  await page.close();
} catch (error) {
  failures.push(error.stack || error.message);
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Regression production check passed for demo seed 20260812.');
console.log('This check does not sign off the module as independently validated.');
console.log('Outstanding findings: Statistico/validation/regression/FINDINGS.md');
for (const line of limits) console.log(`Limitation: ${line}`);

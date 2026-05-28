/* global Office */

let anovaRangeData = null;
let anovaRangeAddress = '';
let anovaDialog = null;

function onRangeDataLoaded(values, address) {
  anovaRangeData = values;
  anovaRangeAddress = address || '';
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes('/taskpane/')) return `${href.split('/taskpane/')[0]}/dialogs/views/`;
  return `${window.location.origin}/dialogs/views/`;
}

function openAnovaBuilder() {
  if (!anovaRangeData || anovaRangeData.length < 2) return;
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}anova/anova-input.html?v=${Date.now()}`,
    DIALOG_SIZES.REGRESSION_BUILDER,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      anovaDialog = asyncResult.value;
      setTimeout(sendAnovaConfigData, 550);
      if (window.StatisticoDialogHost) {
        StatisticoDialogHost.onUserClosed(anovaDialog, function () { anovaDialog = null; });
      }
      anovaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || '{}');
          if (message.action === 'ready' || message.action === 'requestData') {
            sendAnovaConfigData();
          } else if (message.action === 'anovaModel') {
            sessionStorage.setItem('anovaModelSpec', JSON.stringify(message.data || message.payload || {}));
            anovaDialog.close();
            anovaDialog = null;
            setTimeout(openAnovaResultsDialog, 380);
          } else if (message.action === 'close') {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(anovaDialog, function () { anovaDialog = null; });
            } else {
              anovaDialog.close();
              anovaDialog = null;
            }
          }
        } catch (_e) {}
      });
    }
  );
}

function sendAnovaConfigData() {
  if (!anovaDialog || !anovaRangeData) return;
  const headers = anovaRangeData[0] || [];
  const rows = anovaRangeData.slice(1);
  const savedModelSpec = JSON.parse(sessionStorage.getItem('anovaModelSpec') || 'null');
  anovaDialog.messageChild(JSON.stringify({
    type: 'ANOVA_DATA',
    payload: { headers, rows, address: anovaRangeAddress, savedModelSpec }
  }));
}

/* ──────────────────────────────────────────────────────────────
   STATISTICS ENGINE
   ────────────────────────────────────────────────────────────── */

function parseNum(v) {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(String(v).trim().replace(',', '.'));
  return isFinite(n) ? n : NaN;
}

function mean(a) { return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); }
function variance(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}
function sd(a) { return Math.sqrt(Math.max(0, variance(a))); }
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}
function quantile(a, q) {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/* Normal / chi-square approximations */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}
function normalCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
function chiSquarePval(x, df) {
  if (!isFinite(x) || !isFinite(df) || df <= 0 || x < 0) return NaN;
  const z = (Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return Math.max(0, Math.min(1, 1 - normalCdf(z)));
}
function fPval(F, df1, df2) {
  /* Wilson-Hilferty approximation for F → chi² → p */
  return chiSquarePval(F * df1, df1);
}

/* ── One-way ANOVA ─────────────────────────────────────────── */
function oneWayAnova(grouped, levels) {
  const arrays = levels.map(lv => grouped[lv] || []);
  const k = arrays.length;
  const N = arrays.reduce((s, a) => s + a.length, 0);
  const grand = arrays.flat();
  const grandMean = mean(grand);
  let ssBetween = 0, ssWithin = 0;
  arrays.forEach(arr => {
    const m = mean(arr);
    ssBetween += arr.length * (m - grandMean) ** 2;
    arr.forEach(v => { ssWithin += (v - m) ** 2; });
  });
  const df1 = k - 1, df2 = N - k;
  const msBetween = df1 > 0 ? ssBetween / df1 : 0;
  const msWithin  = df2 > 0 ? ssWithin  / df2 : 0;
  const F = msWithin > 0 ? msBetween / msWithin : 0;
  const p = fPval(F, df1, df2);
  const etaSq = (ssBetween + ssWithin) > 0 ? ssBetween / (ssBetween + ssWithin) : 0;
  const omegaSq = (ssBetween + ssWithin + msWithin) > 0
    ? Math.max(0, (ssBetween - df1 * msWithin) / (ssBetween + ssWithin + msWithin)) : 0;
  const cohenF  = etaSq < 1 ? Math.sqrt(etaSq / Math.max(1e-12, 1 - etaSq)) : 0;
  return { k, N, ssBetween, ssWithin, ssTotal: ssBetween + ssWithin,
    df1, df2, msBetween, msWithin, F, p: Math.max(0, Math.min(1, p)),
    etaSq, omegaSq, cohenF };
}

/* ── Two-way ANOVA (balanced cell approximation) ──────────────── */
function twoWayAnova(cells, factorALevels, factorBLevels) {
  const allVals = Object.values(cells).flat();
  const N = allVals.length;
  const grandMean = mean(allVals);
  const kA = factorALevels.length, kB = factorBLevels.length;

  const marginalA = {};
  factorALevels.forEach(a => {
    const vals = factorBLevels.flatMap(b => cells[`${a}::${b}`] || []);
    marginalA[a] = { mean: mean(vals), n: vals.length };
  });
  const marginalB = {};
  factorBLevels.forEach(b => {
    const vals = factorALevels.flatMap(a => cells[`${a}::${b}`] || []);
    marginalB[b] = { mean: mean(vals), n: vals.length };
  });

  let ssA = 0, ssB = 0, ssAB = 0, ssError = 0;
  factorALevels.forEach(a => {
    ssA += marginalA[a].n * (marginalA[a].mean - grandMean) ** 2;
  });
  factorBLevels.forEach(b => {
    ssB += marginalB[b].n * (marginalB[b].mean - grandMean) ** 2;
  });
  factorALevels.forEach(a => {
    factorBLevels.forEach(b => {
      const cellVals = cells[`${a}::${b}`] || [];
      const cellMean = mean(cellVals);
      ssAB += cellVals.length * (cellMean - marginalA[a].mean - marginalB[b].mean + grandMean) ** 2;
      cellVals.forEach(v => { ssError += (v - cellMean) ** 2; });
    });
  });

  const dfA = kA - 1, dfB = kB - 1, dfAB = dfA * dfB, dfError = Math.max(1, N - kA * kB);
  const msA = dfA > 0 ? ssA / dfA : 0;
  const msB = dfB > 0 ? ssB / dfB : 0;
  const msAB = dfAB > 0 ? ssAB / dfAB : 0;
  const msError = ssError / dfError;
  const FA = msError > 0 ? msA / msError : 0;
  const FB = msError > 0 ? msB / msError : 0;
  const FAB = msError > 0 ? msAB / msError : 0;
  const ssTotal = ssA + ssB + ssAB + ssError;

  return {
    N, grandMean, ssA, ssB, ssAB, ssError, ssTotal,
    dfA, dfB, dfAB, dfError,
    msA, msB, msAB, msError,
    FA, FB, FAB,
    pA: Math.max(0, Math.min(1, fPval(FA, dfA, dfError))),
    pB: Math.max(0, Math.min(1, fPval(FB, dfB, dfError))),
    pAB: Math.max(0, Math.min(1, fPval(FAB, dfAB, dfError))),
    etaSqA: ssTotal > 0 ? ssA / ssTotal : 0,
    etaSqB: ssTotal > 0 ? ssB / ssTotal : 0,
    etaSqAB: ssTotal > 0 ? ssAB / ssTotal : 0
  };
}

/* ── Repeated Measures (one-factor) ─────────────────────────── */
function repeatedMeasuresAnova(subjectArrays, levelNames) {
  /* subjectArrays: array of subjects, each an array of condition values (ordered as levelNames) */
  const k = levelNames.length;
  const n = subjectArrays.length;
  const N = n * k;
  const grandMean = mean(subjectArrays.flat());

  let ssBetweenConditions = 0;
  const condMeans = levelNames.map((_, j) => mean(subjectArrays.map(s => s[j])));
  condMeans.forEach(m => { ssBetweenConditions += n * (m - grandMean) ** 2; });

  const subjectMeans = subjectArrays.map(s => mean(s));
  let ssBetweenSubjects = k * subjectMeans.reduce((s, m) => s + (m - grandMean) ** 2, 0);

  const ssTotal = subjectArrays.flat().reduce((s, v) => s + (v - grandMean) ** 2, 0);
  const ssError = ssTotal - ssBetweenConditions - ssBetweenSubjects;

  const dfConditions = k - 1;
  const dfSubjects   = n - 1;
  const dfError      = dfConditions * dfSubjects;

  const msConditions = dfConditions > 0 ? ssBetweenConditions / dfConditions : 0;
  const msError      = dfError > 0 ? ssError / dfError : 0;
  const F = msError > 0 ? msConditions / msError : 0;
  const p = fPval(F, dfConditions, dfError);

  /* Mauchly's W approximation */
  const etaSqP = (ssTotal > 0) ? ssBetweenConditions / (ssBetweenConditions + ssError) : 0;

  return { k, n, N, grandMean,
    ssBetweenConditions, ssBetweenSubjects, ssError, ssTotal,
    dfConditions, dfSubjects, dfError,
    msConditions, msError, F, p: Math.max(0, Math.min(1, p)),
    condMeans, subjectMeans, etaSqP };
}

/* ── Kruskal-Wallis ──────────────────────────────────────────── */
function kruskalWallis(grouped, levels) {
  const pooled = [];
  levels.forEach((lv, gi) => (grouped[lv] || []).forEach(v => pooled.push({ v, gi })));
  pooled.sort((a, b) => a.v - b.v);
  let i = 0;
  while (i < pooled.length) {
    let j = i + 1;
    while (j < pooled.length && pooled[j].v === pooled[i].v) j++;
    const r = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) pooled[k].rank = r;
    i = j;
  }
  const N = pooled.length;
  const rankSums = Array(levels.length).fill(0);
  const ns = levels.map(lv => (grouped[lv] || []).length);
  pooled.forEach(p => { rankSums[p.gi] += p.rank; });
  let H = 0;
  for (let g = 0; g < levels.length; g++) {
    if (ns[g] > 0) H += (rankSums[g] ** 2) / ns[g];
  }
  H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
  const df = levels.length - 1;
  const p  = chiSquarePval(H, df);
  const epsilonSq = N > levels.length
    ? Math.max(0, (H - levels.length + 1) / (N - levels.length)) : 0;
  return { H, df, p: Math.max(0, Math.min(1, p)), epsilonSq,
    rankSums, meanRanks: levels.map((lv, g) => ({ level: lv, meanRank: rankSums[g] / Math.max(1, ns[g]) })) };
}

/* ── Levene / Brown-Forsythe ─────────────────────────────────── */
function leveneTest(grouped, levels, useMedian) {
  const devGroups = {};
  levels.forEach(lv => {
    const arr = (grouped[lv] || []).filter(isFinite);
    const center = useMedian ? median(arr) : mean(arr);
    devGroups[lv] = arr.map(v => Math.abs(v - center));
  });
  return oneWayAnova(devGroups, levels);
}

/* ── Welch ANOVA ─────────────────────────────────────────────── */
function welchAnova(grouped, levels) {
  const rows = levels.map(lv => {
    const arr = (grouped[lv] || []).filter(isFinite);
    if (arr.length < 2) return null;
    return { n: arr.length, mean: mean(arr), v: Math.max(variance(arr), 1e-12) };
  }).filter(Boolean);
  const k = rows.length;
  if (k < 2) return null;
  const w = rows.map(r => r.n / r.v);
  const wSum = w.reduce((s, x) => s + x, 0);
  const yW = rows.reduce((s, r, i) => s + w[i] * r.mean, 0) / wSum;
  let numerator = rows.reduce((s, r, i) => s + w[i] * (r.mean - yW) ** 2, 0) / (k - 1);
  let uSum = rows.reduce((s, r, i) => s + (1 / Math.max(1, r.n - 1)) * (1 - w[i] / wSum) ** 2, 0);
  const c = 1 + (2 * (k - 2) / (k * k - 1)) * uSum;
  const F = c > 0 ? numerator / c : 0;
  const df2 = uSum > 0 ? (k * k - 1) / (3 * uSum) : 1;
  return { F, df1: k - 1, df2: Math.max(1, df2), p: Math.max(0, Math.min(1, fPval(F, k - 1, df2))) };
}

/* ── Post-hoc: Tukey HSD (balanced) ─────────────────────────── */
function tukeyHSD(grouped, levels, msError, dfError) {
  const rows = [];
  for (let i = 0; i < levels.length - 1; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = grouped[levels[i]] || [];
      const b = grouped[levels[j]] || [];
      const na = a.length, nb = b.length;
      const diff = mean(a) - mean(b);
      const se = msError > 0 ? Math.sqrt(msError * (1 / Math.max(1, na) + 1 / Math.max(1, nb)) / 2) : 0;
      const q  = se > 0 ? Math.abs(diff) / se : 0;
      /* Approximate p via normal CDF (studentized range) */
      const p  = Math.max(0, Math.min(1, 2 * (1 - normalCdf(q / Math.SQRT2))));
      rows.push({ comparison: `${levels[i]} vs ${levels[j]}`, diff, se, q, p, method: 'Tukey HSD' });
    }
  }
  return rows;
}

/* ── Post-hoc: Games-Howell ─────────────────────────────────── */
function gamesHowell(grouped, levels) {
  const rows = [];
  for (let i = 0; i < levels.length - 1; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = grouped[levels[i]] || [];
      const b = grouped[levels[j]] || [];
      const na = a.length, nb = b.length;
      const va = variance(a), vb = variance(b);
      const diff = mean(a) - mean(b);
      const se = Math.sqrt(va / Math.max(1, na) + vb / Math.max(1, nb));
      const q  = se > 0 ? Math.abs(diff) / se : 0;
      const df = (va / na + vb / nb) ** 2 /
        ((va / na) ** 2 / Math.max(1, na - 1) + (vb / nb) ** 2 / Math.max(1, nb - 1));
      const p = Math.max(0, Math.min(1, 2 * (1 - normalCdf(q / Math.SQRT2))));
      rows.push({ comparison: `${levels[i]} vs ${levels[j]}`, diff, se, q, df, p, method: 'Games-Howell' });
    }
  }
  return rows;
}

/* ── Post-hoc: Bonferroni ────────────────────────────────────── */
function bonferroniPosthoc(grouped, levels, msError, dfError) {
  const raw = [];
  for (let i = 0; i < levels.length - 1; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const a = grouped[levels[i]] || [];
      const b = grouped[levels[j]] || [];
      const na = a.length, nb = b.length;
      const diff = mean(a) - mean(b);
      const se = msError > 0 ? Math.sqrt(msError * (1 / Math.max(1, na) + 1 / Math.max(1, nb))) : 0;
      const t  = se > 0 ? diff / se : 0;
      const p  = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(t)))));
      raw.push({ comparison: `${levels[i]} vs ${levels[j]}`, diff, se, t, p });
    }
  }
  const m = raw.length;
  return raw.map(r => ({ ...r, p: Math.min(1, r.p * m), method: 'Bonferroni' }));
}

/* ── Descriptives per group ──────────────────────────────────── */
function groupDescriptivesFixed(grouped, levels) {
  return levels.map(lv => {
    const arr = (grouped[lv] || []).filter(isFinite);
    const n = arr.length;
    const m = n ? mean(arr) : NaN;
    const s = n > 1 ? sd(arr) : NaN;
    const se = n > 1 ? s / Math.sqrt(n) : NaN;
    const hw = isFinite(se) ? 1.96 * se : NaN;
    return { level: lv, n, mean: m, sd: s, se, ciLow: m - hw, ciHigh: m + hw,
      min: n ? Math.min(...arr) : NaN, max: n ? Math.max(...arr) : NaN,
      median: n ? median(arr) : NaN,
      q1: n ? quantile(arr, .25) : NaN, q3: n ? quantile(arr, .75) : NaN };
  });
}

/* ── Master bundle builder ───────────────────────────────────── */
function buildAnovaBundle(headers, rows, spec) {
  const type = spec.type || 'one-way';  // 'one-way' | 'two-way' | 'repeated'
  const posthocMethod = spec.posthocMethod || 'tukey';
  const alpha = Number(spec.alpha || 0.05);

  /* ── ONE-WAY ─────────────────────────────────────────────── */
  if (type === 'one-way') {
    const dvIdx  = headers.indexOf(spec.dv || headers[0]);
    const grpIdx = headers.indexOf(spec.factor1 || headers[1]);

    const grouped = {};
    rows.forEach(r => {
      const v  = parseNum(r[dvIdx]);
      const lv = String(r[grpIdx] ?? '').trim();
      if (!isFinite(v) || !lv) return;
      if (!grouped[lv]) grouped[lv] = [];
      grouped[lv].push(v);
    });
    const levels = Object.keys(grouped).sort();

    const anova   = oneWayAnova(grouped, levels);
    const kw      = kruskalWallis(grouped, levels);
    const levene  = leveneTest(grouped, levels, false);
    const bf      = leveneTest(grouped, levels, true);
    const welch   = welchAnova(grouped, levels);
    const desc    = groupDescriptivesFixed(grouped, levels);

    let posthoc = [];
    if (levels.length >= 2) {
      if (posthocMethod === 'tukey')      posthoc = tukeyHSD(grouped, levels, anova.msWithin, anova.df2);
      else if (posthocMethod === 'games') posthoc = gamesHowell(grouped, levels);
      else                                posthoc = bonferroniPosthoc(grouped, levels, anova.msWithin, anova.df2);
    }

    return { type, spec: { dv: headers[dvIdx], factor1: headers[grpIdx], alpha, posthocMethod },
      oneWay: anova, kruskalWallis: kw, levene, brownForsythe: bf, welchAnova: welch,
      descriptives: desc, posthoc, levels,
      report: buildReport_1way(anova, kw, desc, levels, alpha) };
  }

  /* ── TWO-WAY ─────────────────────────────────────────────── */
  if (type === 'two-way') {
    const dvIdx = headers.indexOf(spec.dv || headers[0]);
    const aIdx  = headers.indexOf(spec.factor1 || headers[1]);
    const bIdx  = headers.indexOf(spec.factor2 || headers[2]);

    const cells = {};
    const aSet = new Set(), bSet = new Set();
    rows.forEach(r => {
      const v  = parseNum(r[dvIdx]);
      const a  = String(r[aIdx] ?? '').trim();
      const b  = String(r[bIdx] ?? '').trim();
      if (!isFinite(v) || !a || !b) return;
      aSet.add(a); bSet.add(b);
      const key = `${a}::${b}`;
      if (!cells[key]) cells[key] = [];
      cells[key].push(v);
    });
    const aLevels = [...aSet].sort(), bLevels = [...bSet].sort();
    const anova = twoWayAnova(cells, aLevels, bLevels);

    /* Marginal descriptives — using groupDescriptivesFixed for full stats */
    const margGroupsA = {};
    aLevels.forEach(a => { margGroupsA[a] = bLevels.flatMap(b => cells[`${a}::${b}`] || []).filter(isFinite); });
    const descA = groupDescriptivesFixed(margGroupsA, aLevels);

    const margGroupsB = {};
    bLevels.forEach(b => { margGroupsB[b] = aLevels.flatMap(a => cells[`${a}::${b}`] || []).filter(isFinite); });
    const descB = groupDescriptivesFixed(margGroupsB, bLevels);
    const cellDesc = aLevels.flatMap(a => bLevels.map(b => {
      const vals = (cells[`${a}::${b}`] || []).filter(isFinite);
      return { a, b, n: vals.length, mean: vals.length ? mean(vals) : NaN, sd: vals.length > 1 ? sd(vals) : NaN };
    }));

    const fAname = headers[aIdx], fBname = headers[bIdx];
    const interactionSig = anova.pAB < alpha;

    /* Helper: run post-hoc on a grouped object */
    function runPosthoc(grouped, levels) {
      if (posthocMethod === 'games')           return gamesHowell(grouped, levels);
      if (posthocMethod === 'bonferroni')      return bonferroniPosthoc(grouped, levels, anova.msError, anova.dfError);
      return tukeyHSD(grouped, levels, anova.msError, anova.dfError);
    }

    /* ── Main-effect post-hoc (used when interaction NOT significant) */
    const posthocRows = [];

    if (aLevels.length >= 3) {
      const margGroupsA = {};
      aLevels.forEach(a => { margGroupsA[a] = bLevels.flatMap(b => cells[`${a}::${b}`] || []).filter(isFinite); });
      runPosthoc(margGroupsA, aLevels).forEach(r => {
        posthocRows.push({ ...r,
          factor: fAname,
          comparison: fAname + ' ' + r.comparison.replace(' vs ', ' vs ' + fAname + ' ')
        });
      });
    }

    if (bLevels.length >= 3) {
      const margGroupsB = {};
      bLevels.forEach(b => { margGroupsB[b] = aLevels.flatMap(a => cells[`${a}::${b}`] || []).filter(isFinite); });
      runPosthoc(margGroupsB, bLevels).forEach(r => {
        posthocRows.push({ ...r,
          factor: fBname,
          comparison: fBname + ' ' + r.comparison.replace(' vs ', ' vs ' + fBname + ' ')
        });
      });
    }

    /* ── Simple effects (used when interaction IS significant) */
    /* B within each level of A */
    const simpleEffects = [];
    if (bLevels.length >= 3) {
      aLevels.forEach(aLv => {
        const grouped = {};
        bLevels.forEach(b => { grouped[b] = (cells[`${aLv}::${b}`] || []).filter(isFinite); });
        const rows2 = runPosthoc(grouped, bLevels).map(r => ({
          ...r,
          comparison: fBname + ' ' + r.comparison.replace(' vs ', ' vs ' + fBname + ' ')
        }));
        if (rows2.length) simpleEffects.push({ stratum: fAname + ' = ' + aLv, withinFactor: fBname, rows: rows2 });
      });
    }
    /* A within each level of B (only if A has 3+ levels) */
    if (aLevels.length >= 3) {
      bLevels.forEach(bLv => {
        const grouped = {};
        aLevels.forEach(a => { grouped[a] = (cells[`${a}::${bLv}`] || []).filter(isFinite); });
        const rows2 = runPosthoc(grouped, aLevels).map(r => ({
          ...r,
          comparison: fAname + ' ' + r.comparison.replace(' vs ', ' vs ' + fAname + ' ')
        }));
        if (rows2.length) simpleEffects.push({ stratum: fBname + ' = ' + bLv, withinFactor: fAname, rows: rows2 });
      });
    }

    return { type, spec: { dv: headers[dvIdx], factor1: fAname, factor2: fBname, alpha, posthocMethod },
      twoWay: anova, aLevels, bLevels, cells, descA, descB, cellDesc,
      interactionSig,
      posthoc: posthocRows,
      simpleEffects,
      report: buildReport_2way(anova, fAname, fBname, alpha) };
  }

  /* ── REPEATED MEASURES ────────────────────────────────────── */
  if (type === 'repeated') {
    const condCols = (spec.conditions || []).map(c => headers.indexOf(c)).filter(i => i >= 0);
    if (condCols.length < 2) return { type, error: 'Need at least 2 condition columns.' };
    const levelNames = condCols.map(i => headers[i]);
    const subjectArrays = rows.map(r => condCols.map(ci => parseNum(r[ci]))).filter(arr => arr.every(isFinite));

    const anova = repeatedMeasuresAnova(subjectArrays, levelNames);
    const descriptives = levelNames.map((lv, j) => {
      const vals = subjectArrays.map(s => s[j]);
      const m = mean(vals), s2 = sd(vals), se = s2 / Math.sqrt(vals.length);
      return { level: lv, n: vals.length, mean: m, sd: s2, se,
        ciLow: m - 1.96 * se, ciHigh: m + 1.96 * se };
    });

    /* Simple pairwise post-hoc (paired t) */
    const posthoc = [];
    for (let i = 0; i < levelNames.length - 1; i++) {
      for (let j = i + 1; j < levelNames.length; j++) {
        const diffs = subjectArrays.map(s => s[i] - s[j]);
        const dMean = mean(diffs), dSd = sd(diffs);
        const n = diffs.length;
        const se = dSd / Math.sqrt(n);
        const t = se > 0 ? dMean / se : 0;
        const p_raw = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(t)))));
        const m = levelNames.length * (levelNames.length - 1) / 2;
        posthoc.push({ comparison: `${levelNames[i]} vs ${levelNames[j]}`,
          diff: dMean, sd: dSd, se, t, p: p_raw, pAdj: Math.min(1, p_raw * m), method: 'Bonferroni' });
      }
    }

    return { type, spec: { conditions: levelNames, alpha },
      repeated: anova, descriptives, posthoc,
      report: buildReport_rm(anova, levelNames, alpha) };
  }

  return { type, error: 'Unknown analysis type.' };
}

function buildReport_1way(anova, kw, desc, levels, alpha) {
  function apaP(p) {
    if (!isFinite(p)) return 'p = —';
    if (p < .001) return 'p < .001';
    return 'p = ' + p.toFixed(3).replace('0.', '.');
  }
  const sig = anova.p < alpha, kwSig = kw.p < alpha;
  const effLbl = anova.etaSq >= .14 ? 'large' : anova.etaSq >= .06 ? 'medium' : 'small';
  return {
    apa: `A one-way ANOVA revealed ${sig ? 'a statistically significant' : 'no statistically significant'} effect of group on the outcome, ` +
      `F(${anova.df1}, ${anova.df2}) = ${anova.F.toFixed(2)}, ${apaP(anova.p)}, η² = ${anova.etaSq.toFixed(3).replace('0.','.')} (${effLbl} effect).`,
    nonParam: `A Kruskal-Wallis test ${kwSig ? 'confirmed' : 'did not confirm'} a significant group difference, H(${kw.df}) = ${kw.H.toFixed(2)}, ${apaP(kw.p)}.`,
    consistency: sig === kwSig ? 'Parametric and non-parametric conclusions agree.' : 'Parametric and non-parametric tests disagree — inspect distributions and outliers.'
  };
}
function buildReport_2way(anova, fA, fB, alpha) {
  function apaP(p) {
    if (!isFinite(p)) return 'p = —';
    if (p < .001) return 'p < .001';
    if (p < .01)  return 'p = ' + p.toFixed(3).replace('0.', '.');
    return 'p = ' + p.toFixed(3).replace('0.', '.');
  }
  function apaEta(v) { return 'η² = ' + v.toFixed(3).replace('0.', '.'); }
  function effLbl(v) { return v >= .14 ? 'large' : v >= .06 ? 'medium' : 'small'; }

  const sigA   = anova.pA  < alpha, sigB = anova.pB < alpha, sigAB = anova.pAB < alpha;

  /* ── Sentence 1: omnibus results ── */
  const s1 = `A two-way ANOVA revealed ${sigA ? 'a significant' : 'no significant'} main effect of ${fA}, ` +
    `F(${anova.dfA}, ${anova.dfError}) = ${anova.FA.toFixed(2)}, ${apaP(anova.pA)}, ${apaEta(anova.etaSqA)} (${effLbl(anova.etaSqA)} effect), ` +
    `and ${sigB ? 'a significant' : 'no significant'} main effect of ${fB}, ` +
    `F(${anova.dfB}, ${anova.dfError}) = ${anova.FB.toFixed(2)}, ${apaP(anova.pB)}, ${apaEta(anova.etaSqB)} (${effLbl(anova.etaSqB)} effect).`;

  /* ── Sentence 2: interaction ── */
  const s2 = sigAB
    ? `Importantly, a significant ${fA} × ${fB} interaction was observed, ` +
      `F(${anova.dfAB}, ${anova.dfError}) = ${anova.FAB.toFixed(2)}, ${apaP(anova.pAB)}, ${apaEta(anova.etaSqAB)}, ` +
      `indicating that the effect of ${fB} differed across levels of ${fA}.`
    : `The ${fA} × ${fB} interaction was not significant, ` +
      `F(${anova.dfAB}, ${anova.dfError}) = ${anova.FAB.toFixed(2)}, ${apaP(anova.pAB)}, ${apaEta(anova.etaSqAB)}, ` +
      `suggesting that the effect of ${fB} did not differ across levels of ${fA}.`;

  /* ── Sentence 3: follow-up guidance ── */
  const s3 = sigAB
    ? `Follow-up simple effects analyses are recommended to examine the effect of ${fB} within each level of ${fA} (see Comparisons tab).`
    : (sigA || sigB)
      ? `Post-hoc comparisons for ${[sigA ? fA : null, sigB ? fB : null].filter(Boolean).join(' and ')} are available in the Comparisons tab.`
      : `No further comparisons are warranted.`;

  return { apa: s1, interaction: s2, followup: s3 };
}
function buildReport_rm(anova, levels, alpha) {
  function apaP(p) {
    if (!isFinite(p)) return 'p = —';
    if (p < .001) return 'p < .001';
    return 'p = ' + p.toFixed(3).replace('0.', '.');
  }
  const sig = anova.p < alpha;
  const effLbl = anova.etaSqP >= .14 ? 'large' : anova.etaSqP >= .06 ? 'medium' : 'small';
  return {
    apa: `A one-way repeated measures ANOVA ${sig ? 'revealed a significant' : 'did not reveal a significant'} effect of condition, ` +
      `F(${anova.dfConditions}, ${anova.dfError}) = ${anova.F.toFixed(2)}, ${apaP(anova.p)}, η²p = ${anova.etaSqP.toFixed(3).replace('0.','.')} (${effLbl} effect).` +
      (sig ? ` Post-hoc pairwise comparisons (Bonferroni-corrected) are available in the Comparisons tab.` : '')
  };
}

/* ── Open results dialog ────────────────────────────────────── */
function openAnovaResultsDialog() {
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}anova/anova-results.html?v=${Date.now()}`,
    DIALOG_SIZES.RESULTS_ANOVA,
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      anovaDialog = asyncResult.value;
      if (window.HubResultsBridge) HubResultsBridge.registerDialog(anovaDialog);
      if (window.StatisticoDialogHost) {
        StatisticoDialogHost.onUserClosed(anovaDialog, function () { anovaDialog = null; });
      }
      anovaDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || '{}');
          if (message.action === 'ready') sendAnovaBundle();
          else if (message.action === 'HOST_EVENT') {
            if (message.data) {
              const current = JSON.parse(sessionStorage.getItem('anovaModelSpec') || '{}');
              sessionStorage.setItem('anovaModelSpec', JSON.stringify({ ...current, ...message.data }));
            }
            sendAnovaBundle();
          } else if (message.action === 'close') {
            if (window.StatisticoDialogHost) {
              StatisticoDialogHost.closeFromMessage(anovaDialog, function () { anovaDialog = null; });
            } else {
              anovaDialog.close();
              anovaDialog = null;
            }
          }
        } catch (_e) { console.error(_e); }
      });
      setTimeout(sendAnovaBundle, 1100);
    }
  );
}

function sendAnovaBundle() {
  if (!anovaDialog || !anovaRangeData) return;
  const headers = anovaRangeData[0] || [];
  const rows = anovaRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem('anovaModelSpec') || '{}');
  const bundle = buildAnovaBundle(headers, rows, modelSpec);

  /* Send raw data separately to stay under 4MB limit */
  const rawPayload = { type: 'ANOVA_BUNDLE', payload: bundle };
  anovaDialog.messageChild(JSON.stringify(rawPayload));

  setTimeout(() => {
    if (!anovaDialog) return;
    anovaDialog.messageChild(JSON.stringify({
      type: 'ANOVA_RAW_DATA',
      payload: { headers, rows: anovaRangeData.slice(1, 501), totalCases: rows.length }
    }));
  }, 350);
}

window.openAnovaBuilder = openAnovaBuilder;
window.openAnovaResultsDialog = openAnovaResultsDialog;

(function (hubKey, fn) {
  window.StatisticoHubResults = window.StatisticoHubResults || {};
  window.StatisticoHubResults[hubKey] = function () {
    var gr = window.StatisticoGlobalRange && window.StatisticoGlobalRange.load();
    if (!gr || !gr.values || gr.values.length < 2) return false;
    return fn(gr);
  };
})('anova', function (gr) {
  onRangeDataLoaded(gr.values, gr.address);
  openAnovaResultsDialog();
  return true;
});

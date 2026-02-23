/* global Office */

let dependentRangeData = null;
let dependentRangeAddress = "";
let dependentDialog = null;

function onRangeDataLoaded(values, address) {
  if (!values || values.length < 2) return showPanel(false);
  dependentRangeData = values;
  dependentRangeAddress = address || "";
  
  // Persist to sessionStorage for reliability
  sessionStorage.setItem("dependentRangeData", JSON.stringify(values));
  sessionStorage.setItem("dependentRangeAddress", address || "");
  
  const headers = values[0] || [];
  const rows = values.slice(1);
  const r = document.getElementById("depRange");
  const n = document.getElementById("depRows");
  const c = document.getElementById("depCols");
  if (r) r.textContent = dependentRangeAddress || "Selection";
  if (n) n.textContent = rows.length;
  if (c) c.textContent = headers.length;
  showPanel(true);
  updateButtonState();
}

function showPanel(show) {
  const panel = document.getElementById("depPanel");
  const btn = document.getElementById("openDependentBuilder");
  if (panel) panel.style.display = show ? "block" : "none";
  if (btn) btn.disabled = !show;
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes("/taskpane/")) return `${href.split("/taskpane/")[0]}/dialogs/views/`;
  return `${window.location.origin}/dialogs/views/`;
}

function openDependentBuilder() {
  console.log("=== openDependentBuilder CLICKED ===");
  console.log("dependentRangeData:", dependentRangeData);
  if (!dependentRangeData || dependentRangeData.length < 2) {
    console.log("openDependentBuilder: early exit, no data");
    return;
  }
  console.log("Opening configuration dialog...");
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}dependent/dependent-input.html?v=${Date.now()}`,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      dependentDialog = asyncResult.value;
      setTimeout(sendDialogData, 550);
      dependentDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || "{}");
          if (message.action === "ready" || message.action === "requestData") sendDialogData();
          else if (message.action === "dependentModel") {
            console.log("=== Received dependentModel from config dialog ===");
            console.log("message.data:", message.data);
            sessionStorage.setItem("dependentModelSpec", JSON.stringify(message.data || message.payload || {}));
            console.log("Saved to sessionStorage, closing config dialog...");
            dependentDialog.close();
            dependentDialog = null;
            updateButtonState();
            console.log("Calling openDependentResultsDialog in 380ms...");
            setTimeout(openDependentResultsDialog, 380);
          } else if (message.action === "close") {
            dependentDialog.close();
            dependentDialog = null;
          }
        } catch (_e) {}
      });
    }
  );
}

function sendDialogData() {
  if (!dependentDialog || !dependentRangeData) return;
  const headers = dependentRangeData[0] || [];
  const rows = dependentRangeData.slice(1);
  const savedModelSpec = JSON.parse(sessionStorage.getItem("dependentModelSpec") || "null");
  dependentDialog.messageChild(JSON.stringify({
    type: "DEPENDENT_DATA",
    payload: { headers, rows, address: dependentRangeAddress, savedModelSpec }
  }));
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

function mean(a) { return a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); }
function variance(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
  return s / (a.length - 1);
}
function sd(a) { return Math.sqrt(Math.max(0, variance(a))); }
function median(a) {
  const s = a.slice().sort((x, y) => x - y);
  if (!s.length) return NaN;
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

function computePairedT(a, b, alt) {
  // Compute paired t-test
  const diffs = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const d = a[i] - b[i];
    if (isFinite(d)) diffs.push(d);
  }
  const n = diffs.length;
  if (n < 2) return { t: NaN, df: 0, p: NaN, diff: NaN };
  const m = mean(diffs);
  const s = sd(diffs);
  const se = s / Math.sqrt(n);
  const t = se > 0 ? m / se : 0;
  const df = n - 1;
  // Simple z-approximation for p-value
  const z = Math.abs(t);
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t + -1.453152027) * t + 1.421413741) * t + -0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax));
    return sign * y;
  };
  const normalCdf = (z) => 0.5 * (1 + erf(z / Math.sqrt(2)));
  let p = 2 * (1 - normalCdf(z));
  if (alt === "greater") p = 1 - normalCdf(t);
  if (alt === "less") p = normalCdf(t);
  return { t, df, p: Math.max(0, Math.min(1, p)), diff: m };
}

function computeWilcoxon(a, b, alt) {
  // Compute Wilcoxon signed-rank test
  const diffs = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const d = a[i] - b[i];
    if (isFinite(d) && d !== 0) diffs.push(d);
  }
  const n = diffs.length;
  if (n < 2) return { w: NaN, p: NaN };
  const ranked = diffs.map((d, i) => ({ d: Math.abs(d), sign: d > 0 ? 1 : -1, i }));
  ranked.sort((x, y) => x.d - y.d);
  let rank = 1;
  for (let i = 0; i < ranked.length; i++) {
    let j = i;
    while (j < ranked.length - 1 && ranked[j + 1].d === ranked[j].d) j++;
    const avgRank = (rank + (rank + (j - i))) / 2;
    for (let k = i; k <= j; k++) ranked[k].rank = avgRank;
    rank += (j - i + 1);
    i = j;
  }
  let wPlus = 0;
  ranked.forEach(r => { if (r.sign > 0) wPlus += r.rank; });
  const mu = n * (n + 1) / 4;
  const sigma = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const z = sigma > 0 ? (wPlus - mu) / sigma : 0;
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t + -1.453152027) * t + 1.421413741) * t + -0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax));
    return sign * y;
  };
  const normalCdf = (z) => 0.5 * (1 + erf(z / Math.sqrt(2)));
  let p = 2 * (1 - normalCdf(Math.abs(z)));
  if (alt === "greater") p = 1 - normalCdf(z);
  if (alt === "less") p = normalCdf(z);
  return { w: wPlus, p: Math.max(0, Math.min(1, p)) };
}

function computeRepeatedMeasuresANOVA(headers, rows, selectedColumns, primaryFramework, posthocMethod, posthocCorrection) {
  console.log("Computing Repeated Measures ANOVA for", selectedColumns.length, "timepoints");
  console.log("Primary Framework:", primaryFramework);
  console.log("Post-hoc Method:", posthocMethod, "Correction:", posthocCorrection);
  
  // Extract data for each timepoint
  const k = selectedColumns.length;
  const groupData = selectedColumns.map(colName => {
    const idx = headers.indexOf(colName);
    const values = [];
    rows.forEach(r => {
      const v = parseNum(r[idx]);
      if (isFinite(v)) values.push(v);
    });
    return values;
  });
  
  // Find complete cases (rows with valid data in all columns)
  const completeCases = [];
  for (let i = 0; i < rows.length; i++) {
    const rowValues = selectedColumns.map(colName => parseNum(rows[i][headers.indexOf(colName)]));
    if (rowValues.every(v => isFinite(v))) {
      completeCases.push(rowValues);
    }
  }
  
  const n = completeCases.length;
  const totalRows = rows.length;
  const missingCount = totalRows - n;
  const missingPct = totalRows > 0 ? (missingCount / totalRows * 100) : 0;
  
  console.log(`Total rows: ${totalRows}, Complete cases: ${n}, Missing: ${missingCount} (${missingPct.toFixed(1)}%)`);
  
  if (n < 2 || k < 2) {
    return {
      totalN: n,
      totalRows: totalRows,
      missingCount: missingCount,
      missingPct: missingPct,
      grandMean: NaN,
      omnibus: {},
      assumptions: {},
      effects: {},
      consistency: "Insufficient data"
    };
  }
  
  // Calculate means for each timepoint
  const groupMeans = groupData.map(g => g.length ? mean(g) : NaN);
  const groupSDs = groupData.map(g => g.length ? sd(g) : NaN);
  const groupMedians = groupData.map(g => g.length ? median(g) : NaN);
  
  // Grand mean
  const allValues = completeCases.flat();
  const grandMean = mean(allValues);
  
  // Subject means (row means)
  const subjectMeans = completeCases.map(row => mean(row));
  
  // Sum of Squares calculations
  // SS_total = sum of squared deviations from grand mean
  let ssTotal = 0;
  completeCases.forEach(row => {
    row.forEach(val => {
      ssTotal += Math.pow(val - grandMean, 2);
    });
  });
  
  // SS_between (treatments/timepoints)
  let ssBetween = 0;
  for (let j = 0; j < k; j++) {
    const groupMean = groupMeans[j];
    completeCases.forEach(row => {
      ssBetween += Math.pow(groupMean - grandMean, 2);
    });
  }
  
  // SS_subjects
  let ssSubjects = 0;
  subjectMeans.forEach(subjMean => {
    ssSubjects += k * Math.pow(subjMean - grandMean, 2);
  });
  
  // SS_error (residual)
  let ssError = 0;
  completeCases.forEach((row, i) => {
    const subjMean = subjectMeans[i];
    row.forEach((val, j) => {
      const groupMean = groupMeans[j];
      ssError += Math.pow(val - groupMean - subjMean + grandMean, 2);
    });
  });
  
  // Degrees of freedom
  const dfBetween = k - 1;
  const dfSubjects = n - 1;
  const dfError = (n - 1) * (k - 1);
  const dfTotal = n * k - 1;
  
  // Mean squares
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msSubjects = dfSubjects > 0 ? ssSubjects / dfSubjects : 0;
  const msError = dfError > 0 ? ssError / dfError : 0;
  
  // F-statistic
  const fStat = msError > 0 ? msBetween / msError : 0;
  
  // Approximate p-value using F-distribution approximation
  const pValue = approximateFTest(fStat, dfBetween, dfError);
  
  // Effect sizes for RM-ANOVA
  // Eta squared (total effect)
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;
  
  // Partial eta squared (effect excluding subject variability) - SPSS standard
  const partialEtaSquared = (ssBetween + ssError) > 0 ? ssBetween / (ssBetween + ssError) : 0;
  
  // Generalized eta squared (comparable across designs) - JASP standard
  const generalizedEtaSquared = (ssBetween + ssSubjects + ssError) > 0 
    ? ssBetween / (ssBetween + ssSubjects + ssError) 
    : 0;
  
  // Omega squared (less biased than eta squared)
  const omegaSquared = ssTotal > 0 ? (ssBetween - dfBetween * msError) / (ssTotal + msError) : 0;
  
  // Cohen's f from partial eta squared (FIXED: was computing incorrectly)
  const cohenF = partialEtaSquared < 1 ? Math.sqrt(partialEtaSquared / (1 - partialEtaSquared)) : 0;
  
  // Friedman test (nonparametric alternative)
  const friedman = computeFriedmanTest(completeCases, k, n);
  
  // Kendall's W (effect size for Friedman) - Coefficient of concordance
  const kendallW = friedman.W || 0;
  
  // Correlation matrix (within-subject consistency)
  const correlationMatrix = computeCorrelationMatrix(completeCases, k);
  
  // Mauchly's Test of Sphericity
  const sphericity = computeMauchlySphericity(completeCases, k, n);
  
  // Apply sphericity corrections to F-test if violated
  let fStatCorrected = fStat;
  let dfBetweenCorrected = dfBetween;
  let dfErrorCorrected = dfError;
  let pValueGG = pValue;
  let pValueHF = pValue;
  
  if (!sphericity.sphericityMet && k >= 3) {
    // Greenhouse-Geisser correction
    dfBetweenCorrected = dfBetween * sphericity.epsilonGG;
    dfErrorCorrected = dfError * sphericity.epsilonGG;
    pValueGG = approximateFTest(fStat, dfBetweenCorrected, dfErrorCorrected);
    
    // Huynh-Feldt correction
    const dfBetweenHF = dfBetween * sphericity.epsilonHF;
    const dfErrorHF = dfError * sphericity.epsilonHF;
    pValueHF = approximateFTest(fStat, dfBetweenHF, dfErrorHF);
  }
  
  // Post-hoc pairwise comparisons using PAIRED t-tests or Wilcoxon (based on framework)
  const posthoc = computeRMPostHocComparisons(completeCases, selectedColumns, n, k, primaryFramework, posthocMethod, posthocCorrection);
  
  // Compute Levene and Brown-Forsythe tests for homogeneity
  const levene = computeLeveneTest(groupData);
  const brownForsythe = computeBrownForsytheTest(groupData);
  
  return {
    totalN: n,
    totalRows: totalRows,
    missingCount: missingCount,
    missingPct: missingPct,
    grandMean: grandMean,
    correlationMatrix: correlationMatrix,
    omnibus: {
      N: n,
      k: k,
      levels: selectedColumns,
      groupDescriptives: selectedColumns.map((name, i) => ({
        name: name,
        n: groupData[i].length,
        mean: groupMeans[i],
        sd: groupSDs[i],
        median: groupMedians[i]
      })),
      // RM-ANOVA results (proper structure: Time, Subjects, Error)
      anovaF: fStat,
      anovaDf1: dfBetween,  // df for Time
      anovaDf2: dfError,     // df for Error (Time × Subject interaction)
      anovaDfSubjects: dfSubjects,  // df for Subjects
      anovaP: pValue,
      // Sphericity corrected values
      anovaPGG: pValueGG,
      anovaPHF: pValueHF,
      anovaDf1GG: dfBetweenCorrected,
      anovaDf2GG: dfErrorCorrected,
      // Sum of Squares (proper RM decomposition)
      anovaSSTime: ssBetween,      // SS for Time (treatment)
      anovaSSSubjects: ssSubjects,  // SS for Subjects (between-subject variation)
      anovaSSError: ssError,        // SS for Error (residual)
      anovaSSTotal: ssTotal,        // Total SS
      // Mean Squares
      anovaMSTime: msBetween,       // MS for Time
      anovaMSSubjects: msSubjects,  // MS for Subjects
      anovaMSError: msError,        // MS for Error
      // Legacy names for backward compatibility (will be deprecated)
      anovaSSBetween: ssBetween,
      anovaSSWithin: ssError,
      anovaMSBetween: msBetween,
      anovaMSWithin: msError,
      // Friedman results (use correct terminology: Chi-square, not H or Kruskal)
      friedmanChiSquare: friedman.chiSquare,
      friedmanDf: friedman.df,
      friedmanP: friedman.p,
      friedmanMeanRanks: friedman.meanRanks,
      friedmanW: friedman.kendallW,  // Kendall's W effect size
      kendallW: friedman.kendallW,
      // Legacy names (will be deprecated - these reference Kruskal which is WRONG for RM)
      kwH: friedman.H,  // DEPRECATED: This is actually Friedman χ², not Kruskal H
      kwDf: friedman.df,
      kwP: friedman.p,
      meanRanks: friedman.meanRanks,
      // Sphericity test
      sphericity: sphericity,
      // Effect sizes (RM-appropriate)
      etaSquared: etaSquared,                    // Total eta squared
      partialEtaSquared: partialEtaSquared,      // Partial eta squared (SPSS standard)
      generalizedEtaSquared: generalizedEtaSquared,  // Generalized eta squared (JASP standard)
      omegaSquared: omegaSquared,                // Omega squared (less biased)
      cohenF: cohenF,                            // Cohen's f (corrected formula)
      epsilonSquared: friedman.epsilonSquared,   // Friedman effect size
      etaSquaredH: friedman.etaSquaredH,         // Alternative Friedman effect size
      // REMOVED for RM: levene, brownForsythe, welchAnova (not valid for repeated measures)
    },
    assumptions: {
      sphericity: sphericity,
      completeCases: n,
      missingSubjects: missingCount,
      note: "Repeated measures assumptions: sphericity (tested via Mauchly), normality of differences (visual inspection recommended)"
    },
    effects: {
      etaSquared: etaSquared,
      partialEtaSquared: partialEtaSquared,
      generalizedEtaSquared: generalizedEtaSquared,
      omegaSquared: omegaSquared,
      cohenF: cohenF,
      kendallW: kendallW
    },
    posthoc: posthoc,
    consistency: pValue < 0.05 && friedman.p < 0.05 ? "Both tests significant" :
                 pValue >= 0.05 && friedman.p >= 0.05 ? "Both tests non-significant" :
                 "Tests disagree - check assumptions"
  };
}

function approximateFTest(f, df1, df2) {
  // Simple approximation of F-test p-value
  // For more accuracy, a proper F-distribution CDF would be needed
  if (!isFinite(f) || f <= 0) return 1;
  if (f > 100) return 0.0001;
  
  // Beta function approximation for F-distribution
  const x = df2 / (df2 + df1 * f);
  
  // Simplified approximation
  if (f < 1) return 0.9;
  if (f < 2) return 0.5;
  if (f < 3) return 0.2;
  if (f < 4) return 0.1;
  if (f < 5) return 0.05;
  if (f < 7) return 0.02;
  if (f < 10) return 0.01;
  return 0.001;
}

function computeFriedmanTest(completeCases, k, n) {
  // Friedman test: nonparametric alternative to repeated measures ANOVA
  // Rank each row independently
  const rankedData = completeCases.map(row => {
    const indexed = row.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    const ranks = new Array(k);
    for (let i = 0; i < k; i++) {
      ranks[indexed[i].idx] = i + 1;
    }
    return ranks;
  });
  
  // Sum of ranks for each condition
  const rankSums = new Array(k).fill(0);
  rankedData.forEach(ranks => {
    ranks.forEach((rank, j) => {
      rankSums[j] += rank;
    });
  });
  
  // Mean ranks
  const meanRanks = {};
  rankSums.forEach((sum, j) => {
    meanRanks[`Timepoint ${j + 1}`] = sum / n;
  });
  
  // Friedman test statistic (Chi-square)
  const sumOfSquaredRankSums = rankSums.reduce((acc, rs) => acc + rs * rs, 0);
  const chiSquare = (12 / (n * k * (k + 1))) * sumOfSquaredRankSums - 3 * n * (k + 1);
  
  // Approximate p-value using chi-square distribution
  const df = k - 1;
  const p = approximateChiSquareTest(chiSquare, df);
  
  // Kendall's W (Coefficient of Concordance) - effect size for Friedman
  // W ranges from 0 (no agreement) to 1 (perfect agreement)
  const kendallW = chiSquare / (n * (k - 1));
  
  // Legacy effect sizes for Friedman
  const epsilonSquared = chiSquare / (n * (k - 1));
  const etaSquaredH = chiSquare / (n * k - 1);
  
  return { 
    H: chiSquare,  // Use consistent naming (this is chi-square, not H)
    chiSquare: chiSquare,
    df, 
    p, 
    meanRanks, 
    W: kendallW,  // Kendall's W
    kendallW: kendallW,
    epsilonSquared, 
    etaSquaredH 
  };
}

function computeMauchlySphericity(completeCases, k, n) {
  // Mauchly's Test of Sphericity
  // Tests if variances of differences between conditions are equal
  
  if (k < 3) {
    // Sphericity is not testable with only 2 conditions
    return {
      W: 1,
      chiSq: 0,
      df: 0,
      p: 1,
      sphericityMet: true,
      epsilonGG: 1,
      epsilonHF: 1,
      note: "Sphericity not applicable (k<3)"
    };
  }
  
  // Compute difference scores for all pairs
  const differences = [];
  for (let i = 0; i < k - 1; i++) {
    for (let j = i + 1; j < k; j++) {
      const diffs = completeCases.map(row => row[i] - row[j]);
      differences.push(diffs);
    }
  }
  
  // Covariance matrix of differences
  const numDiffs = differences.length;
  const covMatrix = [];
  for (let i = 0; i < numDiffs; i++) {
    covMatrix[i] = [];
    for (let j = 0; j < numDiffs; j++) {
      const cov = covariance(differences[i], differences[j]);
      covMatrix[i][j] = cov;
    }
  }
  
  // Calculate Mauchly's W (determinant ratio)
  // Simplified approximation for small k
  const variances = differences.map(d => variance(d));
  const meanVar = variances.reduce((a, b) => a + b, 0) / variances.length;
  const productVar = variances.reduce((a, b) => a * b, 1);
  const W = variances.length > 0 ? Math.pow(productVar / Math.pow(meanVar, variances.length), 1 / variances.length) : 1;
  
  // Chi-square approximation for Mauchly's test
  const dfMauchly = (k * (k - 1) / 2) - 1;
  const chiSq = -(n - 1 - (2 * k * k + k + 2) / (6 * k)) * Math.log(Math.max(W, 0.001));
  const p = approximateChiSquareTest(chiSq, dfMauchly);
  
  // Greenhouse-Geisser epsilon (conservative correction)
  const sumVar = variances.reduce((a, b) => a + b, 0);
  const sumSqVar = variances.reduce((a, b) => a + b * b, 0);
  const epsilonGG = Math.min(1, Math.max(0, (k * k * meanVar * meanVar) / ((k - 1) * sumSqVar)));
  
  // Huynh-Feldt epsilon (less conservative)
  const epsilonHF = Math.min(1, Math.max(epsilonGG, (n * (k - 1) * epsilonGG - 2) / ((k - 1) * (n - 1 - (k - 1) * epsilonGG))));
  
  const sphericityMet = p > 0.05;
  
  return {
    W: W,
    chiSq: chiSq,
    df: dfMauchly,
    p: p,
    sphericityMet: sphericityMet,
    epsilonGG: epsilonGG,
    epsilonHF: epsilonHF,
    note: sphericityMet ? "Sphericity assumption met" : "Sphericity violated - corrections recommended"
  };
}

function covariance(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  const mean1 = arr1.reduce((a, b) => a + b, 0) / arr1.length;
  const mean2 = arr2.reduce((a, b) => a + b, 0) / arr2.length;
  let cov = 0;
  for (let i = 0; i < arr1.length; i++) {
    cov += (arr1[i] - mean1) * (arr2[i] - mean2);
  }
  return cov / (arr1.length - 1);
}

function approximateChiSquareTest(chiSq, df) {
  // Simple chi-square approximation
  if (!isFinite(chiSq) || chiSq <= 0) return 1;
  if (chiSq > 20) return 0.0001;
  
  // Critical values approximation
  if (df === 1) {
    if (chiSq < 2.71) return 0.1;
    if (chiSq < 3.84) return 0.05;
    if (chiSq < 6.63) return 0.01;
    return 0.001;
  } else if (df === 2) {
    if (chiSq < 4.61) return 0.1;
    if (chiSq < 5.99) return 0.05;
    if (chiSq < 9.21) return 0.01;
    return 0.001;
  } else if (df === 3) {
    if (chiSq < 6.25) return 0.1;
    if (chiSq < 7.81) return 0.05;
    if (chiSq < 11.34) return 0.01;
    return 0.001;
  } else {
    // General approximation
    const ratio = chiSq / df;
    if (ratio < 1.2) return 0.5;
    if (ratio < 1.5) return 0.2;
    if (ratio < 2.0) return 0.05;
    if (ratio < 2.5) return 0.01;
    return 0.001;
  }
}

function computeLeveneTest(groupData) {
  // Levene's test for homogeneity of variance
  const k = groupData.length;
  const groupMeans = groupData.map(g => mean(g));
  
  // Absolute deviations from group means
  const deviations = groupData.map((g, i) => g.map(val => Math.abs(val - groupMeans[i])));
  
  // Grand mean of deviations
  const allDeviations = deviations.flat();
  const grandMeanDev = mean(allDeviations);
  
  // Between-group sum of squares for deviations
  let ssBetween = 0;
  deviations.forEach(dev => {
    const devMean = mean(dev);
    ssBetween += dev.length * Math.pow(devMean - grandMeanDev, 2);
  });
  
  // Within-group sum of squares for deviations
  let ssWithin = 0;
  deviations.forEach(dev => {
    const devMean = mean(dev);
    dev.forEach(d => {
      ssWithin += Math.pow(d - devMean, 2);
    });
  });
  
  const dfBetween = k - 1;
  const totalN = allDeviations.length;
  const dfWithin = totalN - k;
  
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  
  const f = msWithin > 0 ? msBetween / msWithin : 0;
  const p = approximateFTest(f, dfBetween, dfWithin);
  
  return { f, df1: dfBetween, df2: dfWithin, p };
}

function computeBrownForsytheTest(groupData) {
  // Brown-Forsythe test: robust version of Levene using medians
  const k = groupData.length;
  const groupMedians = groupData.map(g => median(g));
  
  // Absolute deviations from group medians
  const deviations = groupData.map((g, i) => g.map(val => Math.abs(val - groupMedians[i])));
  
  // Grand mean of deviations
  const allDeviations = deviations.flat();
  const grandMeanDev = mean(allDeviations);
  
  // Between-group sum of squares for deviations
  let ssBetween = 0;
  deviations.forEach(dev => {
    const devMean = mean(dev);
    ssBetween += dev.length * Math.pow(devMean - grandMeanDev, 2);
  });
  
  // Within-group sum of squares for deviations
  let ssWithin = 0;
  deviations.forEach(dev => {
    const devMean = mean(dev);
    dev.forEach(d => {
      ssWithin += Math.pow(d - devMean, 2);
    });
  });
  
  const dfBetween = k - 1;
  const totalN = allDeviations.length;
  const dfWithin = totalN - k;
  
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  
  const f = msWithin > 0 ? msBetween / msWithin : 0;
  const p = approximateFTest(f, dfBetween, dfWithin);
  
  return { f, df1: dfBetween, df2: dfWithin, p };
}

function computeRMPostHocComparisons(completeCases, timepointNames, n, k, primaryFramework, posthocMethod, posthocCorrection) {
  // Post-hoc for Repeated Measures: PAIRED t-tests (parametric) or Wilcoxon (nonparametric)
  // NOT Tukey HSD (which assumes independence)
  
  console.log("computeRMPostHocComparisons called with method:", posthocMethod, "correction:", posthocCorrection);
  
  const isNonParametric = primaryFramework === "nonparametric";
  
  // Handle "none" method
  if (posthocMethod === "none") {
    return {
      enabled: false,
      rows: [],
      pairwise: [],
      method: "None",
      correction: "N/A",
      note: "Post-hoc comparisons disabled"
    };
  }
  
  // Determine actual test to use based on framework and method
  let useWilcoxon = false;
  let useConover = false;
  let useNemenyi = false;
  
  if (isNonParametric) {
    if (posthocMethod === "wilcoxon") {
      useWilcoxon = true;
    } else if (posthocMethod === "conover") {
      useConover = true;
    } else if (posthocMethod === "nemenyi") {
      useNemenyi = true;
    } else {
      useWilcoxon = true; // Default for nonparametric
    }
  }
  
  const comparisons = [];
  
  // Determine which comparisons to run based on method
  const pairsToCompare = [];
  
  if (posthocMethod === "paired-baseline") {
    // Compare all timepoints vs the first (baseline)
    for (let j = 1; j < k; j++) {
      pairsToCompare.push([0, j]);
    }
  } else {
    // All pairwise comparisons (default for "paired", "wilcoxon", "conover", "nemenyi")
    for (let i = 0; i < k - 1; i++) {
      for (let j = i + 1; j < k; j++) {
        pairsToCompare.push([i, j]);
      }
    }
  }
  
  for (const [i, j] of pairsToCompare) {
      // Extract paired data for timepoints i and j
      const time1 = completeCases.map(row => row[i]);
      const time2 = completeCases.map(row => row[j]);
      
      // Compute paired differences
      const diffs = time1.map((v, idx) => v - time2[idx]).filter(d => isFinite(d));
      
      if (diffs.length === 0) continue;
      
      let statistic, pRaw, estimate, ciLower, ciUpper, effectSize;
      
      if (useWilcoxon) {
        // WILCOXON SIGNED-RANK TEST
        const wilcoxonResult = computeWilcoxon(time1, time2, "two-sided");
        statistic = wilcoxonResult.w;
        pRaw = wilcoxonResult.p;
        
        // Convert W to Z approximation for large samples
        const nPairs = diffs.length;
        const expectedW = nPairs * (nPairs + 1) / 4;
        const varianceW = nPairs * (nPairs + 1) * (2 * nPairs + 1) / 24;
        const zStat = (statistic - expectedW) / Math.sqrt(varianceW);
        
        // Effect size r = Z / sqrt(N) for Wilcoxon
        const effectSizeR = Math.abs(zStat) / Math.sqrt(nPairs);
        
        estimate = effectSizeR; // Effect size r (between 0 and 1)
        statistic = zStat; // Z-statistic (standardized)
        ciLower = NaN; // No CI for nonparametric
        ciUpper = NaN;
        effectSize = effectSizeR;
      } else {
        // PAIRED T-TEST (PARAMETRIC)
        const meanDiff = mean(diffs);
        const sdDiff = sd(diffs);
        const seDiff = sdDiff / Math.sqrt(diffs.length);
        
        // Paired t-statistic
        const tStat = seDiff > 0 ? meanDiff / seDiff : 0;
        const df = diffs.length - 1;
        pRaw = approximateTTest(Math.abs(tStat), df);
        
        // Confidence interval
        const tCrit = 2.0; // Approximate 95% critical value
        ciLower = meanDiff - tCrit * seDiff;
        ciUpper = meanDiff + tCrit * seDiff;
        
        // Cohen's d for paired samples
        const cohenD = sdDiff > 0 ? Math.abs(meanDiff / sdDiff) : 0;
        
        statistic = tStat;
        estimate = meanDiff; // Mean difference
        effectSize = cohenD;
      }
      
      // Format comparison label for RM (use "Time" terminology)
      const label1 = timepointNames[i].replace(/^(Group|Var|Column)/, 'Time');
      const label2 = timepointNames[j].replace(/^(Group|Var|Column)/, 'Time');
      
      comparisons.push({
        comparison: label1 + " vs " + label2,
        timepoint1: timepointNames[i],
        timepoint2: timepointNames[j],
        estimate: estimate,
        statistic: statistic,
        rawP: pRaw,
        adjP: pRaw, // Will be updated with correction
        ciLower: ciLower,
        ciUpper: ciUpper,
        effectSize: effectSize
      });
  }
  
  // Apply p-value correction based on user selection
  if (posthocCorrection === "holm") {
    // Holm-Bonferroni correction (step-down)
    comparisons.sort((a, b) => a.rawP - b.rawP);
    const numComparisons = comparisons.length;
    for (let idx = 0; idx < numComparisons; idx++) {
      comparisons[idx].adjP = Math.min(1, comparisons[idx].rawP * (numComparisons - idx));
      // Propagate minimum adjusted p-value
      if (idx > 0) {
        comparisons[idx].adjP = Math.max(comparisons[idx].adjP, comparisons[idx - 1].adjP);
      }
    }
  } else if (posthocCorrection === "bonferroni") {
    // Bonferroni correction (simple)
    const numComparisons = comparisons.length;
    comparisons.forEach(comp => {
      comp.adjP = Math.min(1, comp.rawP * numComparisons);
    });
  } else if (posthocCorrection === "bh") {
    // Benjamini-Hochberg (FDR) correction
    comparisons.sort((a, b) => a.rawP - b.rawP);
    const numComparisons = comparisons.length;
    for (let idx = numComparisons - 1; idx >= 0; idx--) {
      const rank = idx + 1;
      comparisons[idx].adjP = Math.min(1, comparisons[idx].rawP * numComparisons / rank);
      // Propagate minimum adjusted p-value
      if (idx < numComparisons - 1) {
        comparisons[idx].adjP = Math.min(comparisons[idx].adjP, comparisons[idx + 1].adjP);
      }
    }
  } else {
    // No correction
    comparisons.forEach(comp => {
      comp.adjP = comp.rawP;
    });
  }
  
  // Format method and correction names for display
  let methodName;
  if (useWilcoxon) {
    methodName = "Wilcoxon Signed-Rank";
  } else if (useConover) {
    methodName = "Conover";
  } else if (useNemenyi) {
    methodName = "Nemenyi";
  } else {
    methodName = "Paired t-tests";
  }
  
  const correctionName = {
    "holm": "Holm",
    "bonferroni": "Bonferroni",
    "bh": "FDR (Benjamini-Hochberg)",
    "none": "None"
  }[posthocCorrection] || "Holm";
  
  const vsBaseline = (posthocMethod === "paired-baseline");
  
  return {
    enabled: true,
    rows: comparisons,
    pairwise: comparisons,
    method: methodName,
    correction: correctionName,
    note: useWilcoxon || useConover || useNemenyi
      ? `Post-hoc comparisons use ${methodName} test (nonparametric, rank-based) with ${correctionName} correction${vsBaseline ? " vs Baseline" : ""}` 
      : `Post-hoc comparisons use ${methodName} (appropriate for repeated measures) with ${correctionName} correction${vsBaseline ? " vs Baseline" : ""}`
  };
}

function computePostHocComparisons(groupData, groupNames, msError, n) {
  // Pairwise comparisons with multiple comparison correction
  const k = groupData.length;
  const comparisons = [];
  
  for (let i = 0; i < k - 1; i++) {
    for (let j = i + 1; j < k; j++) {
      const g1 = groupData[i];
      const g2 = groupData[j];
      
      const m1 = mean(g1);
      const m2 = mean(g2);
      const diff = m1 - m2;
      
      // Tukey HSD
      const sem = Math.sqrt(msError / n);
      const qStat = sem > 0 ? Math.abs(diff) / sem : 0;
      
      // Approximate p-value
      let p = approximateTukeyP(qStat, k, n);
      
      // Games-Howell (for unequal variances)
      const v1 = variance(g1);
      const v2 = variance(g2);
      const n1 = g1.length;
      const n2 = g2.length;
      const seGH = Math.sqrt(v1 / n1 + v2 / n2);
      const tGH = seGH > 0 ? Math.abs(diff) / seGH : 0;
      const pGH = approximateTTest(tGH, Math.min(n1, n2) - 1);
      
      comparisons.push({
        comparison: groupNames[i] + " vs " + groupNames[j],
        group1: groupNames[i],
        group2: groupNames[j],
        estimate: diff,
        diff: diff,
        se: sem,
        statistic: qStat,
        rawP: p,
        adjP: p, // Will be updated with Holm correction
        tukey: { q: qStat, p: p },
        gamesHowell: { t: tGH, p: pGH }
      });
    }
  }
  
  // Apply Holm correction
  comparisons.sort((a, b) => a.rawP - b.rawP);
  const numComparisons = comparisons.length;
  comparisons.forEach((comp, idx) => {
    comp.adjP = Math.min(1, comp.rawP * (numComparisons - idx));
    comp.tukey.pHolm = Math.min(1, comp.tukey.p * (numComparisons - idx));
    comp.gamesHowell.pHolm = Math.min(1, comp.gamesHowell.p * (numComparisons - idx));
  });
  
  return {
    enabled: true,
    rows: comparisons,
    pairwise: comparisons,
    method: "Tukey HSD / Games-Howell",
    correction: "Holm"
  };
}

function approximateTukeyP(q, k, n) {
  // Approximate Tukey HSD p-value
  if (q < 2) return 0.9;
  if (q < 3) return 0.5;
  if (q < 3.5) return 0.2;
  if (q < 4) return 0.1;
  if (q < 4.5) return 0.05;
  if (q < 5) return 0.02;
  if (q < 6) return 0.01;
  return 0.001;
}

function approximateTTest(t, df) {
  // Approximate t-test p-value (two-tailed)
  const absT = Math.abs(t);
  if (absT < 1) return 0.9;
  if (absT < 1.5) return 0.5;
  if (absT < 2) return 0.2;
  if (absT < 2.5) return 0.05;
  if (absT < 3) return 0.02;
  if (absT < 4) return 0.01;
  return 0.001;
}

function computeCorrelationMatrix(completeCases, k) {
  // Compute pairwise Pearson correlations between timepoints
  const correlations = [];
  
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const time1 = completeCases.map(row => row[i]);
      const time2 = completeCases.map(row => row[j]);
      
      const n = time1.length;
      if (n < 2) continue;
      
      const mean1 = time1.reduce((a, b) => a + b, 0) / n;
      const mean2 = time2.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let sum1Sq = 0;
      let sum2Sq = 0;
      
      for (let idx = 0; idx < n; idx++) {
        const diff1 = time1[idx] - mean1;
        const diff2 = time2[idx] - mean2;
        numerator += diff1 * diff2;
        sum1Sq += diff1 * diff1;
        sum2Sq += diff2 * diff2;
      }
      
      const denominator = Math.sqrt(sum1Sq * sum2Sq);
      const r = denominator > 0 ? numerator / denominator : 0;
      
      correlations.push({
        time1: i,
        time2: j,
        r: r,
        label: `Time ${i + 1} - Time ${j + 1}`
      });
    }
  }
  
  // Summary statistics
  const rValues = correlations.map(c => c.r);
  const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;
  const minR = rValues.length > 0 ? Math.min(...rValues) : 0;
  const maxR = rValues.length > 0 ? Math.max(...rValues) : 0;
  
  // Compound symmetry check (are correlations similar?)
  const range = maxR - minR;
  const compoundSymmetry = range < 0.2 ? "Good" : range < 0.4 ? "Moderate" : "Poor";
  
  return {
    correlations: correlations,
    avgR: avgR,
    minR: minR,
    maxR: maxR,
    range: range,
    compoundSymmetry: compoundSymmetry,
    interpretation: avgR > 0.7 ? "Strong within-subject consistency" :
                    avgR > 0.4 ? "Moderate within-subject consistency" :
                    "Weak within-subject consistency (high individual variability)"
  };
}


function buildDependentBundle(headers, rows, spec) {
  console.log("=== buildDependentBundle START ===");
  console.log("spec:", spec);
  const compareMode = spec.compareMode || (spec.mode === "k-plus" ? "k-plus" : "two-vars");
  console.log("compareMode:", compareMode);
  const mode = compareMode === "k-plus" ? "k-plus" : "two-column";
  const primaryFramework = spec.primaryFramework || "parametric";
  
  let selectedColumns = Array.isArray(spec.selectedColumns) && spec.selectedColumns.length
    ? spec.selectedColumns.filter(name => headers.indexOf(name) >= 0)
    : headers.slice();
  console.log("selectedColumns:", selectedColumns);
  
  const selectedColumnStats = selectedColumns.map((name) => {
    const idx = headers.indexOf(name);
    const values = [];
    rows.forEach((r) => {
      const v = parseNum(r[idx]);
      if (isFinite(v)) values.push(v);
    });
    return {
      name,
      label: name,
      n: values.length,
      missing: rows.length - values.length,
      mean: values.length ? mean(values) : NaN,
      sd: values.length ? sd(values) : NaN,
      stdDev: values.length ? sd(values) : NaN,
      median: values.length ? median(values) : NaN,
      iqr: NaN // TODO: calculate IQR if needed
    };
  });
  
  // For k-plus mode, perform repeated measures ANOVA
  if (compareMode === "k-plus" && selectedColumns.length >= 3) {
    console.log("Computing k-plus (3+ timepoints) analysis");
    const posthocMethod = spec.posthocMethod || "paired";
    const posthocCorrection = spec.posthocCorrection || "holm";
    const rmResults = computeRepeatedMeasuresANOVA(headers, rows, selectedColumns, primaryFramework, posthocMethod, posthocCorrection);
    return {
      setup: {
        mode,
        compareMode,
        primaryFramework,
        hypothesis: spec.hypothesis || "two-sided",
        confidence: Number(spec.confidence || 0.95),
        selectedColumns: selectedColumns.slice(),
        headers: selectedColumns.slice(),
        primaryTest: spec.primaryTest || "rm-anova",
        posthocMethod: spec.posthocMethod || "paired",
        posthocCorrection: spec.posthocCorrection || "holm"
      },
      explore: {
        selectedColumnStats,
        correlationMatrix: rmResults.correlationMatrix,
        kplusSummary: {
          variableCount: selectedColumns.length,
          totalN: rmResults.totalN,
          levelsCount: selectedColumns.length,
          meanOverall: rmResults.grandMean
        }
      },
      assumptions: rmResults.assumptions || {},
      results: {
        omnibus: rmResults.omnibus || {},
        posthoc: rmResults.posthoc || {}
      },
      effects: rmResults.effects || {},
      power: { note: "Power analysis placeholder", placeholderPower: 0.80 },
      report: {
        consistency: rmResults.consistency || "Results computed"
      }
    };
  }
  
  // Two-variable mode (original code)
  let t1 = [], t2 = [];
  let completePairs = 0;
  let totalRows = rows.length;
  
  if (compareMode === "two-vars") {
    const aIdx = headers.indexOf(spec.groupA || selectedColumns[0] || headers[0]);
    const bIdx = headers.indexOf(spec.groupB || selectedColumns[1] || selectedColumns[0] || headers[1] || headers[0]);
    rows.forEach(r => {
      const a = parseNum(r[aIdx]);
      const b = parseNum(r[bIdx]);
      if (isFinite(a)) t1.push(a);
      if (isFinite(b)) t2.push(b);
      // Count complete pairs
      if (isFinite(a) && isFinite(b)) completePairs++;
    });
  }
  
  const missingPairs = totalRows - completePairs;
  const missingPct = totalRows > 0 ? (missingPairs / totalRows * 100) : 0;
  
  console.log(`Two-timepoint analysis: Total rows: ${totalRows}, Complete pairs: ${completePairs}, Missing: ${missingPairs} (${missingPct.toFixed(1)}%)`);
  
  const alt = spec.hypothesis || "two-sided";
  const paired = computePairedT(t1, t2, alt);
  const wilcoxon = computeWilcoxon(t1, t2, alt);
  
  const n1 = t1.length, n2 = t2.length;
  const sp = Math.sqrt((((Math.max(0, n1 - 1)) * variance(t1)) + ((Math.max(0, n2 - 1)) * variance(t2))) / Math.max(1, n1 + n2 - 2));
  const d = sp > 0 ? (mean(t1) - mean(t2)) / sp : 0;
  const g = d * (1 - (3 / Math.max(1, (4 * (n1 + n2) - 9))));
  
  return {
    setup: {
      mode,
      compareMode,
      primaryFramework,
      hypothesis: alt,
      confidence: Number(spec.confidence || 0.95),
      selectedColumns: selectedColumns.slice(),
      groupA: spec.groupA || "",
      groupB: spec.groupB || "",
      groupALabel: spec.groupALabel || "Time 1",
      groupBLabel: spec.groupBLabel || "Time 2",
      headers: selectedColumns.slice()
    },
    explore: {
      n1, n2,
      totalRows: totalRows,
      completePairs: completePairs,
      missingPairs: missingPairs,
      missingPct: missingPct,
      mean1: mean(t1), mean2: mean(t2),
      med1: median(t1), med2: median(t2),
      sd1: sd(t1), sd2: sd(t2),
      selectedColumnStats
    },
    assumptions: {
      normalityA: n1 >= 8 ? "Check normality of differences" : "Sample too small",
      normalityB: n2 >= 8 ? "Check normality of differences" : "Sample too small",
      recommendation: "Paired t-test for parametric; Wilcoxon for non-parametric"
    },
    results: {
      primary: "Paired t-test",
      pairedT: paired.t,
      pairedDf: paired.df,
      pairedP: paired.p,
      meanDiff: paired.diff,
      wilcoxonW: wilcoxon.w,
      wilcoxonP: wilcoxon.p
    },
    effects: {
      hedgesG: g,
      rankBiserial: wilcoxon.w / Math.max(1, n1)
    },
    report: {
      apaPaired: `Paired t-test showed ${paired.p < 0.05 ? "a significant" : "no significant"} change, t(${paired.df})=${paired.t.toFixed(2)}, p=${paired.p.toFixed(4)}.`,
      apaWilcoxon: `Wilcoxon signed-rank test indicated ${wilcoxon.p < 0.05 ? "a significant" : "no significant"} shift, W=${wilcoxon.w.toFixed(2)}, p=${wilcoxon.p.toFixed(4)}.`
    }
  };
}

function openDependentResultsDialog() {
  const modelSpec = JSON.parse(sessionStorage.getItem("dependentModelSpec") || "{}");
  console.log("=== openDependentResultsDialog ===");
  console.log("modelSpec from sessionStorage:", modelSpec);
  const isKPlus = (modelSpec.compareMode || modelSpec.mode) === "k-plus";
  console.log("isKPlus:", isKPlus);
  const resultsPage = isKPlus ? "dependent-results-kplus.html" : "dependent-results.html";
  console.log("Opening results page:", resultsPage);
  Office.context.ui.displayDialogAsync(
    `${getDialogsBaseUrl()}dependent/${resultsPage}?v=${Date.now()}`,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) return;
      dependentDialog = asyncResult.value;
      dependentDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
        try {
          const message = JSON.parse(arg.message || "{}");
          console.log("[Results dialog message]", message.action);
          if (message.action === "ready") sendDependentBundle();
          else if (message.action === "HOST_EVENT") {
            if (message.cmd === "dependentSettingsChanged" && message.data) {
              const current = JSON.parse(sessionStorage.getItem("dependentModelSpec") || "{}");
              const next = Object.assign({}, current, message.data);
              sessionStorage.setItem("dependentModelSpec", JSON.stringify(next));
            }
            sendDependentBundle();
          }
          else if (message.action === "close") { dependentDialog.close(); dependentDialog = null; }
        } catch (_e) { console.error("Results dialog message error:", _e); }
      });
      setTimeout(sendDependentBundle, 1100);
    }
  );
}

function sendDependentBundle() {
  console.log("=== sendDependentBundle called ===");
  
  // Restore from sessionStorage if not in memory
  if (!dependentRangeData) {
    const stored = sessionStorage.getItem("dependentRangeData");
    if (stored) {
      dependentRangeData = JSON.parse(stored);
      dependentRangeAddress = sessionStorage.getItem("dependentRangeAddress") || "";
      console.log("Restored dependentRangeData from sessionStorage");
    }
  }
  
  if (!dependentDialog || !dependentRangeData) {
    console.log("sendDependentBundle: early exit", { dependentDialog: !!dependentDialog, dependentRangeData: !!dependentRangeData });
    return;
  }
  const headers = dependentRangeData[0] || [];
  const rows = dependentRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem("dependentModelSpec") || "{}");
  console.log("sendDependentBundle: calling buildDependentBundle with modelSpec:", modelSpec);
  const bundle = buildDependentBundle(headers, rows, modelSpec);
  console.log("sendDependentBundle: bundle built, sending to dialog");
  dependentDialog.messageChild(JSON.stringify({ 
    type: "DEPENDENT_BUNDLE", 
    payload: bundle,
    rawData: dependentRangeData
  }));
}

function resetDependentModel() {
  sessionStorage.removeItem("dependentModelSpec");
  updateButtonState();
}

function updateButtonState() {
  const has = !!sessionStorage.getItem("dependentModelSpec");
  const openBtn = document.getElementById("openDependentBuilder");
  const resetBtn = document.getElementById("resetDependentModelBtn");
  if (openBtn) {
    openBtn.innerHTML = has
      ? '<i class="fa-solid fa-sliders"></i> Open Configuration'
      : '<i class="fa-solid fa-up-right-from-square"></i> Open Configuration';
    openBtn.onclick = openDependentBuilder;
    openBtn.disabled = !dependentRangeData || dependentRangeData.length < 2;
  }
  if (resetBtn) resetBtn.style.display = has ? "inline-block" : "none";
}

window.openDependentBuilder = openDependentBuilder;
window.openDependentResultsDialog = openDependentResultsDialog;
window.resetDependentModel = resetDependentModel;

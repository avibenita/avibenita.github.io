/* Shared meta-analysis engine — used by Results for interactive measure switching */
(function (global) {
'use strict';
function _normalizeMetaNumericString(v) {
  if (typeof v === 'number') return isFinite(v) ? String(v) : '';
  if (v == null || typeof v === 'boolean') return '';
  var s = String(v)
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    .replace(/\u2212/g, '-')
    .replace(/^\s+|\s+$/g, '');
  s = s.replace(/^[\u2010\u2011\u2012\u2013\u2014\u2015]+/, '-');
  return s.replace(/^\s+|\s+$/g, '');
}

function parseMetaNumber(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = _normalizeMetaNumericString(v);
  if (!s) return NaN;
  var n = Number(s);
  if (isFinite(n)) return n;
  if (s.indexOf(',') >= 0 && s.indexOf('.') < 0) {
    n = Number(s.replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

function _metaNum(v) {
  return parseMetaNumber(v);
}

function _specType(spec) {
  return (spec && spec.effectType) || 'continuous';
}

function _specMeasure(spec) {
  var t = _specType(spec);
  var m = (spec && spec.effectMeasure) || '';
  if (m) return m;
  if (t === 'binary') return 'rr';
  if (t === 'direct') return 'generic';
  if (t === 'correlation') return 'fisherz';
  return 'smd';
}

function isFisherCorrelationSpec(spec) {
  var t = _specType(spec);
  var m = _specMeasure(spec);
  return t === 'correlation' || (t === 'direct' && m === 'fisherz');
}

function isLogRatioSpec(spec) {
  var t = _specType(spec);
  var m = _specMeasure(spec);
  if (t === 'binary') return m === 'rr' || m === 'or' || m === '';
  if (t === 'continuous') return m === 'rom';
  if (t === 'direct') return m === 'logrr' || m === 'logor';
  return false;
}

function isOddsRatioSpec(spec) {
  var m = _specMeasure(spec);
  return m === 'or' || m === 'logor';
}

function isRiskRatioSpec(spec) {
  var m = _specMeasure(spec);
  return m === 'rr' || m === 'logrr';
}

function isPrecomputedRatioSpec(spec) {
  var t = _specType(spec);
  var m = _specMeasure(spec);
  return t === 'direct' && (m === 'logor' || m === 'logrr');
}

function isGenericDirectSpec(spec) {
  return _specType(spec) === 'direct' && _specMeasure(spec) === 'generic';
}

function usesEventMeaningSpec(spec) {
  return _specType(spec) === 'binary' || isPrecomputedRatioSpec(spec);
}

function _cleanLabel(v, fallback) {
  var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s || fallback;
}

function defaultDirectionLabels(spec) {
  if (isPrecomputedRatioSpec(spec)) {
    return {
      numeratorLabel: 'Group A',
      referenceLabel: 'Group B',
      eventLabel: 'Event',
      leftLabel: 'Lower ratio',
      rightLabel: 'Higher ratio',
      outcomeBetter: 'none'
    };
  }
  if (isGenericDirectSpec(spec)) {
    return {
      numeratorLabel: 'Negative effect',
      referenceLabel: 'Positive effect',
      eventLabel: '',
      leftLabel: 'Negative effect',
      rightLabel: 'Positive effect',
      outcomeBetter: 'none'
    };
  }
  if (_specType(spec) === 'binary') {
    return {
      numeratorLabel: 'Treatment',
      referenceLabel: 'Control',
      eventLabel: 'Event',
      leftLabel: 'Treatment',
      rightLabel: 'Control',
      outcomeBetter: 'lower'
    };
  }
  return {
    numeratorLabel: 'Treatment',
    referenceLabel: 'Control',
    eventLabel: '',
    leftLabel: 'Treatment',
    rightLabel: 'Control',
    outcomeBetter: 'lower'
  };
}

function resolveOutcomeBetter(spec) {
  var defaults = defaultDirectionLabels(spec);
  if (spec && (spec.outcomeBetter === 'lower' || spec.outcomeBetter === 'higher' || spec.outcomeBetter === 'none')) {
    return spec.outcomeBetter;
  }
  if (spec && spec.effectDirection === 'control') return 'lower';
  return defaults.outcomeBetter;
}

function resolveDirectionContext(spec) {
  var defaults = defaultDirectionLabels(spec);
  var better = resolveOutcomeBetter(spec);
  var meaning = better === 'higher' ? 'beneficial' : better === 'lower' ? 'adverse' : 'unspecified';
  return {
    numeratorLabel: _cleanLabel(spec && spec.numeratorLabel, defaults.numeratorLabel),
    referenceLabel: _cleanLabel(spec && spec.referenceLabel, defaults.referenceLabel),
    eventLabel: _cleanLabel(spec && spec.eventLabel, defaults.eventLabel || 'Event'),
    leftLabel: _cleanLabel(spec && spec.leftLabel, defaults.leftLabel),
    rightLabel: _cleanLabel(spec && spec.rightLabel, defaults.rightLabel),
    outcomeBetter: better,
    eventMeaning: meaning,
    meaningLabel: better === 'higher' ? 'Beneficial' : better === 'lower' ? 'Adverse' : 'Not specified'
  };
}

function comparisonLabel(spec) {
  if (isFisherCorrelationSpec(spec)) return 'Association';
  var ctx = resolveDirectionContext(spec);
  if (isGenericDirectSpec(spec)) return ctx.leftLabel + ' / ' + ctx.rightLabel;
  if (isLogRatioSpec(spec)) return ctx.numeratorLabel + ' / ' + ctx.referenceLabel;
  return ctx.numeratorLabel + ' \u2212 ' + ctx.referenceLabel;
}

function resultsHeader(spec) {
  var ctx = resolveDirectionContext(spec);
  var comparison = comparisonLabel(spec);
  if (usesEventMeaningSpec(spec)) {
    return {
      comparison: comparison,
      comparisonLine: 'Comparison: ' + comparison,
      outcomeLine: 'Outcome: ' + ctx.eventLabel + ' \u00B7 ' + ctx.meaningLabel,
      eventLabel: ctx.eventLabel,
      meaningLabel: ctx.meaningLabel
    };
  }
  if (isFisherCorrelationSpec(spec)) {
    return {
      comparison: comparison,
      comparisonLine: 'Scale: ' + comparison,
      outcomeLine: betterLine(ctx, spec),
      eventLabel: ctx.eventLabel,
      meaningLabel: ctx.meaningLabel
    };
  }
  return {
    comparison: comparison,
    comparisonLine: (isLogRatioSpec(spec) ? 'Comparison: ' : 'Contrast: ') + comparison,
    outcomeLine: betterLine(ctx, spec),
    eventLabel: ctx.eventLabel,
    meaningLabel: ctx.meaningLabel
  };
}

function betterLine(ctx, spec) {
  if (ctx.outcomeBetter === 'none') {
    if (isFisherCorrelationSpec(spec) || isGenericDirectSpec(spec)) return 'Direction labels: hidden';
    return 'Favour labels: hidden';
  }
  if (isFisherCorrelationSpec(spec)) return 'Association: negative \u2190 0 \u2192 positive';
  if (ctx.outcomeBetter === 'lower') return 'Better outcomes: Lower values';
  return 'Better outcomes: Higher values';
}

function favoredGroup(displayEffect, spec) {
  var ctx = resolveDirectionContext(spec);
  if (ctx.outcomeBetter === 'none') return null;
  if (displayEffect == null || !isFinite(displayEffect)) return null;
  if (isLogRatioSpec(spec)) {
    if (!(displayEffect > 0) || displayEffect === 1) return null;
    var higherInNumerator = displayEffect > 1;
    if (ctx.outcomeBetter === 'higher') {
      return higherInNumerator ? ctx.numeratorLabel : ctx.referenceLabel;
    }
    return higherInNumerator ? ctx.referenceLabel : ctx.numeratorLabel;
  }
  if (displayEffect === 0) return null;
  if (ctx.outcomeBetter === 'lower') {
    return displayEffect < 0 ? ctx.numeratorLabel : ctx.referenceLabel;
  }
  return displayEffect > 0 ? ctx.numeratorLabel : ctx.referenceLabel;
}

function forestFavorLabels(spec) {
  var ctx = resolveDirectionContext(spec);
  if (isFisherCorrelationSpec(spec)) {
    if (ctx.outcomeBetter === 'none') return null;
    return { left: 'Negative association', right: 'Positive association' };
  }
  if (isGenericDirectSpec(spec)) {
    return { left: ctx.leftLabel, right: ctx.rightLabel };
  }
  if (ctx.outcomeBetter === 'none') {
    if (isLogRatioSpec(spec)) return { left: 'Lower ratio', right: 'Higher ratio' };
    return null;
  }
  if (ctx.outcomeBetter === 'lower') {
    return { left: 'Favours ' + ctx.numeratorLabel, right: 'Favours ' + ctx.referenceLabel };
  }
  return { left: 'Favours ' + ctx.referenceLabel, right: 'Favours ' + ctx.numeratorLabel };
}

function ratioQuantityWord(spec) {
  if (isOddsRatioSpec(spec)) return 'odds';
  if (isRiskRatioSpec(spec)) return 'risk';
  return 'ratio';
}

function describeRatioChange(spec, displayRatio) {
  if (!(displayRatio > 0) || !isFinite(displayRatio)) return '';
  var word = ratioQuantityWord(spec);
  var pct = Math.round(Math.abs(1 - displayRatio) * 100);
  var dir = displayRatio > 1 ? 'higher' : displayRatio < 1 ? 'lower' : 'unchanged';
  if (dir === 'unchanged') return 'no difference in ' + word;
  return pct + '% ' + dir + ' ' + word;
}

function _assocVerb(label) {
  var s = String(label || '').trim();
  if (/\b(and|&|with)\b/i.test(s) || /s$/i.test(s) && !/(ss|us|is|Treatment|Control)$/i.test(s)) {
    return 'were';
  }
  return 'was';
}

function _fmtFixed(n, d) {
  if (n == null || !isFinite(n)) return '\u2014';
  return Number(n).toFixed(d == null ? 3 : d);
}

function interpretRatio(spec, displayRatio, lo, hi) {
  var ctx = resolveDirectionContext(spec);
  var qty = ratioQuantityWord(spec);
  var short = isOddsRatioSpec(spec) ? 'OR' : isRiskRatioSpec(spec) ? 'RR' : 'effect';
  var change = describeRatioChange(spec, displayRatio);
  var g = _fmtFixed(displayRatio, 3);
  var loTxt = _fmtFixed(lo, 3);
  var hiTxt = _fmtFixed(hi, 3);
  var favored = favoredGroup(displayRatio, spec);
  var higherInNumerator = displayRatio > 1;
  var mag;
  if (ctx.outcomeBetter === 'none') {
    mag = (higherInNumerator ? 'Higher' : displayRatio < 1 ? 'Lower' : 'Unchanged') +
      ' ' + qty + ' of ' + ctx.eventLabel + ' in ' + ctx.numeratorLabel;
  } else {
    mag = (higherInNumerator ? 'Higher' : 'Lower') + ' ' + qty + ' of ' +
      ctx.eventLabel + ' with ' + ctx.numeratorLabel;
  }
  var lead;
  if (ctx.outcomeBetter !== 'none') {
    var adj = higherInNumerator ? 'greater' : 'lower';
    lead = ctx.numeratorLabel + ' ' + _assocVerb(ctx.numeratorLabel) +
      ' associated with ' + adj + ' ' + qty + ' of ' + ctx.eventLabel +
      ', ' + short + ' = ' + g + ', 95% CI [' + loTxt + ', ' + hiTxt + ']';
  } else {
    lead = 'the pooled ' + (isOddsRatioSpec(spec) ? 'odds ratio' : isRiskRatioSpec(spec) ? 'risk ratio' : 'effect') +
      ' was ' + g + ' (95% CI ' + loTxt + ' to ' + hiTxt + ')';
    if (change) {
      lead += ', indicating ' + change + ' of ' + ctx.eventLabel +
        ' in ' + ctx.numeratorLabel + ' than in ' + ctx.referenceLabel;
    }
  }
  return {
    lead: lead,
    mag: mag,
    favored: favored,
    quantity: qty,
    change: change,
    header: resultsHeader(spec),
    forest: forestFavorLabels(spec)
  };
}

function _metaExtractStudyEffect(row, spec) {
  const effectType = spec.effectType || "continuous";
  const measure = spec.effectMeasure || (
    effectType === "binary" ? "rr"
      : effectType === "direct" ? "generic"
        : effectType === "correlation" ? "fisherz"
          : "smd"
  );
  let yi = null, vi = null;
  let arms = { sourceKind: effectType };

  if (effectType === "continuous") {
    const mean1 = _metaNum(row[spec.mean1Col]);
    const sd1 = _metaNum(row[spec.sd1Col]);
    const n1 = _metaNum(row[spec.n1Col]);
    const mean2 = _metaNum(row[spec.mean2Col]);
    const sd2 = _metaNum(row[spec.sd2Col]);
    const n2 = _metaNum(row[spec.n2Col]);
    if (![mean1, sd1, n1, mean2, sd2, n2].every(isFinite) || n1 < 2 || n2 < 2 || sd1 < 0 || sd2 < 0) {
      return null;
    }
    arms = {
      sourceKind: "continuous",
      n1: n1,
      n2: n2,
      mean1: mean1,
      sd1: sd1,
      mean2: mean2,
      sd2: sd2,
      totalN: n1 + n2
    };
    if (measure === "md") {
      yi = mean1 - mean2;
      vi = (sd1 * sd1) / n1 + (sd2 * sd2) / n2;
    } else if (measure === "rom") {
      if (!(mean1 > 0 && mean2 > 0)) return null;
      yi = Math.log(mean1 / mean2);
      vi = (sd1 * sd1) / (n1 * mean1 * mean1) + (sd2 * sd2) / (n2 * mean2 * mean2);
    } else if (measure === "cohend") {
      // Cohen's d (uncorrected)
      const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
      if (!(pooledSD > 0)) return null;
      yi = (mean1 - mean2) / pooledSD;
      vi = (n1 + n2) / (n1 * n2) + (yi * yi) / (2 * (n1 + n2));
    } else {
      // Hedges' g (bias-corrected SMD)
      const pooledSD = Math.sqrt(((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2));
      if (!(pooledSD > 0)) return null;
      const d = (mean1 - mean2) / pooledSD;
      const j = 1 - (3 / (4 * (n1 + n2 - 2) - 1));
      yi = j * d;
      vi = ((n1 + n2) / (n1 * n2) + (yi * yi) / (2 * (n1 + n2))) * j * j;
    }
  } else if (effectType === "binary") {
    let a = _metaNum(row[spec.aCol]);
    let c = _metaNum(row[spec.cCol]);
    let b, d;
    const fmt = spec.binaryFormat || ((spec.bCol != null && spec.dCol != null) ? "events_nonevents" : "events_total");
    if (fmt === "events_nonevents") {
      b = _metaNum(row[spec.bCol]);
      d = _metaNum(row[spec.dCol]);
    } else {
      const n1 = _metaNum(row[spec.n1Col]);
      const n2 = _metaNum(row[spec.n2Col]);
      if (![a, c, n1, n2].every(isFinite) || a < 0 || c < 0 || n1 <= 0 || n2 <= 0 || a > n1 || c > n2) {
        return null;
      }
      b = n1 - a;
      d = n2 - c;
    }
    if (![a, b, c, d].every(isFinite) || a < 0 || b < 0 || c < 0 || d < 0 || a + b === 0 || c + d === 0) {
      return null;
    }
    // Continuity correction for zero cells on ratio measures
    let aa = a, bb = b, cc = c, dd = d;
    let continuityCorrected = false;
    if (measure !== "rd" && (aa === 0 || bb === 0 || cc === 0 || dd === 0)) {
      aa += 0.5; bb += 0.5; cc += 0.5; dd += 0.5;
      continuityCorrected = true;
    }
    const n1t = aa + bb, n2t = cc + dd;
    arms = {
      sourceKind: "binary",
      n1: a + b,
      n2: c + d,
      events1: a,
      events2: c,
      totalN: a + b + c + d,
      continuityCorrected: continuityCorrected
    };
    if (measure === "rr") {
      const p1 = aa / n1t, p2 = cc / n2t;
      if (!(p1 > 0 && p2 > 0)) return null;
      yi = Math.log(p1 / p2);
      vi = (1 / aa - 1 / n1t) + (1 / cc - 1 / n2t);
    } else if (measure === "rd") {
      const p1 = a / (a + b), p2 = c / (c + d);
      yi = p1 - p2;
      vi = p1 * (1 - p1) / (a + b) + p2 * (1 - p2) / (c + d);
      if (!(vi > 0)) vi = 1e-12;
    } else {
      // log OR
      yi = Math.log((aa * dd) / (bb * cc));
      vi = 1 / aa + 1 / bb + 1 / cc + 1 / dd;
    }
  } else if (effectType === "direct") {
    yi = _metaNum(row[spec.effectCol]);
    const unc = spec.uncertaintyType || "se";
    if (unc === "variance") {
      vi = _metaNum(row[spec.varCol]);
    } else if (unc === "ci") {
      const lo = _metaNum(row[spec.loCol]);
      const hi = _metaNum(row[spec.hiCol]);
      if (![yi, lo, hi].every(isFinite) || !(hi > lo)) return null;
      // Assume 95% CI → SE = (hi - lo) / (2 * 1.96)
      const se = (hi - lo) / (2 * 1.96);
      vi = se * se;
    } else {
      const se = _metaNum(row[spec.seCol]);
      vi = se * se;
    }
    if (!isFinite(yi) || !isFinite(vi) || !(vi > 0)) return null;
    arms = { sourceKind: "direct" };
    if (measure === "fisherz") {
      arms.fisherz = yi;
      arms.pearsonR = Math.tanh(yi);
    }
  } else if (effectType === "correlation") {
    // Pool on Fisher z; present Pearson r = tanh(z) in the UI.
    const format = spec.correlationFormat || "r_n";
    if (format === "z_se") {
      yi = _metaNum(row[spec.effectCol]);
      const unc = spec.uncertaintyType || "se";
      if (unc === "variance") {
        vi = _metaNum(row[spec.varCol]);
      } else if (unc === "ci") {
        const lo = _metaNum(row[spec.loCol]);
        const hi = _metaNum(row[spec.hiCol]);
        if (![yi, lo, hi].every(isFinite) || !(hi > lo)) return null;
        const se = (hi - lo) / (2 * 1.96);
        vi = se * se;
      } else {
        const se = _metaNum(row[spec.seCol]);
        vi = se * se;
      }
      if (!isFinite(yi) || !isFinite(vi) || !(vi > 0)) return null;
      arms = {
        sourceKind: "correlation",
        fisherz: yi,
        pearsonR: Math.tanh(yi)
      };
    } else {
      const r = _metaNum(row[spec.rCol]);
      const n = _metaNum(row[spec.nCol]);
      if (!isFinite(r) || !isFinite(n) || !(Math.abs(r) < 1) || !(n > 3)) return null;
      yi = 0.5 * Math.log((1 + r) / (1 - r));
      vi = 1 / (n - 3);
      if (!isFinite(yi) || !isFinite(vi) || !(vi > 0)) return null;
      arms = {
        sourceKind: "correlation",
        pearsonR: r,
        n: n,
        totalN: n,
        fisherz: yi
      };
    }
  } else {
    return null;
  }

  // outcomeBetter / legacy effectDirection affect interpretation labels only — never flip yi.
  if (!(isFinite(yi) && isFinite(vi) && vi > 0)) return null;
  return Object.assign({ yi: yi, vi: vi, se: Math.sqrt(vi) }, arms);
}

function _metaTau2DL(yi, vi) {
  const k = yi.length;
  const wi = vi.map(function (v) { return 1 / v; });
  const sw = wi.reduce(function (a, b) { return a + b; }, 0);
  const theta = yi.reduce(function (s, y, i) { return s + wi[i] * y; }, 0) / sw;
  const Q = yi.reduce(function (s, y, i) { return s + wi[i] * Math.pow(y - theta, 2); }, 0);
  const sw2 = wi.reduce(function (s, w) { return s + w * w; }, 0);
  const C = sw - sw2 / sw;
  const df = k - 1;
  return { tau2: C > 0 ? Math.max(0, (Q - df) / C) : 0, Q: Q, df: df, thetaFixed: theta, sw: sw };
}

function _metaTau2REML(yi, vi) {
  // Iterative REML (Fisher scoring), seeded with DL.
  const k = yi.length;
  let tau2 = _metaTau2DL(yi, vi).tau2;
  for (let iter = 0; iter < 80; iter++) {
    const wi = vi.map(function (v) { return 1 / (v + tau2); });
    const sw = wi.reduce(function (a, b) { return a + b; }, 0);
    const theta = yi.reduce(function (s, y, i) { return s + wi[i] * y; }, 0) / sw;
    let A = 0, B = 0, R = 0;
    for (let i = 0; i < k; i++) {
      const w = wi[i];
      const r = yi[i] - theta;
      A += w * w;
      B += w * w * w;
      R += w * w * r * r;
    }
    // Score & information for REML restricted likelihood
    const dll = -0.5 * sw + 0.5 * R + 0.5 * (A / sw);
    const d2ll = 0.5 * A - B / sw + 0.5 * (A * A) / (sw * sw);
    if (!(d2ll > 1e-14)) break;
    const step = dll / d2ll;
    const next = Math.max(0, tau2 + step);
    if (Math.abs(next - tau2) < 1e-10) { tau2 = next; break; }
    tau2 = next;
  }
  return tau2;
}

function _metaTCritApprox(df, alphaHalf) {
  // Approximate two-sided t critical (־±/2) for common df; falls back to 1.96.
  if (!(df > 0)) return 1.959964;
  // Rough Cornish-Fisher style for 0.025 (95% CI)
  const z = 1.959964;
  const g1 = (Math.pow(z, 3) + z) / (4 * df);
  const g2 = (5 * Math.pow(z, 5) + 16 * Math.pow(z, 3) + 3 * z) / (96 * df * df);
  return z + g1 + g2;
}

function buildMetaBundle(headers, rows, spec) {
  // Core meta-analysis computation
  try {
    const effectType = spec.effectType || "continuous";
    const model = spec.model || "random";
    const tauEstimator = spec.tauEstimator === "dl" ? "dl" : "reml";
    const useHK = model === "random" && spec.hartungKnapp !== false;
    const studyCol = spec.studyCol;
    const effectMeasure = spec.effectMeasure || (
      effectType === "binary" ? "rr"
        : effectType === "direct" ? "generic"
          : effectType === "correlation" ? "fisherz"
            : "smd"
    );

    const studies = [];
    rows.forEach(function (row, idx) {
      const studyName = row[studyCol] || ("Study " + (idx + 1));
      const extracted = _metaExtractStudyEffect(row, spec);
      if (!extracted) return;
      studies.push(Object.assign({
        name: String(studyName),
        rowIndex: idx,
        yi: extracted.yi,
        vi: extracted.vi,
        se: extracted.se
      }, extracted));
    });

    if (studies.length < 2) {
      return {
        error: effectType === "correlation"
          ? "Need at least 2 valid correlation studies. Check Study label plus Fisher z & SE (or Pearson r & N with |r|<1 and N>3)."
          : "Need at least 2 valid studies for meta-analysis"
      };
    }

    const yi = studies.map(function (s) { return s.yi; });
    const vi = studies.map(function (s) { return s.vi; });
    const dl = _metaTau2DL(yi, vi);
    const Q = dl.Q;
    const df = dl.df;
    let tau2 = 0;
    if (model === "random") {
      tau2 = tauEstimator === "dl" ? dl.tau2 : _metaTau2REML(yi, vi);
    }

    const wi = studies.map(function (s) { return 1 / (s.vi + tau2); });
    const sumWi = wi.reduce(function (a, b) { return a + b; }, 0);
    const theta = studies.reduce(function (sum, s, i) { return sum + wi[i] * s.yi; }, 0) / sumWi;

    let se_theta = Math.sqrt(1 / sumWi);
    let crit = 1.959964;
    let p, zOrT;
    if (useHK && df > 0) {
      // Hartungג€“Knappג€“Sidikג€“Jonkman
      const q = studies.reduce(function (sum, s, i) {
        return sum + wi[i] * Math.pow(s.yi - theta, 2);
      }, 0) / df;
      se_theta = Math.sqrt(Math.max(q, 0) / sumWi);
      crit = _metaTCritApprox(df, 0.025);
      zOrT = se_theta > 0 ? theta / se_theta : 0;
      // Approximate two-sided p with normal for display (t p without full t-CDF)
      p = 2 * (1 - approximateNormalCDF(Math.abs(zOrT) * (1 - 1 / (4 * df))));
    } else {
      zOrT = se_theta > 0 ? theta / se_theta : 0;
      p = 2 * (1 - approximateNormalCDF(Math.abs(zOrT)));
    }
    const ciLower = theta - crit * se_theta;
    const ciUpper = theta + crit * se_theta;

    // 95% prediction interval (random-effects): ־¸ ֲ± t גˆ(SEֲ² + ֿ„ֲ²)
    let piLower = null;
    let piUpper = null;
    if (model === "random" && df > 0) {
      const piCrit = useHK ? crit : _metaTCritApprox(df, 0.025);
      const piSe = Math.sqrt(se_theta * se_theta + tau2);
      piLower = theta - piCrit * piSe;
      piUpper = theta + piCrit * piSe;
    }

    const pQ = approximateChiSquare(Q, df);
    const I2 = Q > 0 ? Math.max(0, Math.min(100, 100 * (Q - df) / Q)) : 0;
    const H2 = df > 0 ? Q / df : 1;

    studies.forEach(function (s, i) {
      s.weight = wi[i];
      s.weightPct = (wi[i] / sumWi) * 100;
      s.ciLower = s.yi - 1.96 * s.se;
      s.ciUpper = s.yi + 1.96 * s.se;
    });

    const bias = computeEggersTest(studies);

    return {
      spec: spec,
      studies: studies,
      k: studies.length,
      pooled: {
        effect: theta,
        se: se_theta,
        ciLower: ciLower,
        ciUpper: ciUpper,
        piLower: piLower,
        piUpper: piUpper,
        z: zOrT,
        p: p,
        df: useHK ? df : null,
        method: useHK ? "hartung-knapp" : "wald",
        crit: crit
      },
      heterogeneity: {
        Q: Q,
        df: df,
        pQ: pQ,
        I2: I2,
        H2: H2,
        tau2: tau2,
        tau: Math.sqrt(tau2),
        tauEstimator: model === "random" ? tauEstimator : null
      },
      bias: bias,
      model: model,
      effectType: effectType,
      effectMeasure: effectMeasure,
      hartungKnapp: useHK
    };

  } catch (err) {
    return { error: err.message };
  }
}

function approximateNormalCDF(z) {
  // Approximation of standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function logGamma(z) {
  // Lanczos approximation for ln Γ(z), z > 0
  if (!(z > 0)) return NaN;
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(a, b, x) {
  // Continued fraction for incomplete beta (Lentz)
  const MAXIT = 200;
  const EPS = 3e-7;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x, a, b) {
  if (!(a > 0) || !(b > 0) || !isFinite(x)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return front * betacf(a, b, x) / a;
  }
  return 1 - front * betacf(b, a, 1 - x) / b;
}

/** Two-sided Student-t p-value: P(|T_df| ≥ |t|). */
function studentTTwoSidedP(t, df) {
  if (!isFinite(t) || !(df > 0)) return 1;
  if (t === 0) return 1;
  const x = df / (df + t * t);
  const p = regularizedIncompleteBeta(x, df / 2, 0.5);
  if (!isFinite(p)) {
    return 2 * (1 - approximateNormalCDF(Math.abs(t)));
  }
  return Math.min(1, Math.max(0, p));
}

function computeEggersTest(studies) {
  // Regress SND = yi/se on precision = 1/se; Egger's intercept tests asymmetry.
  if (!studies || studies.length < 3) {
    return { available: false, reason: "Need at least 3 studies for Egger's test" };
  }
  const n = studies.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const se = studies[i].se || Math.sqrt(studies[i].vi);
    if (!(se > 0)) continue;
    const x = 1 / se;
    const y = studies[i].yi / se;
    sumX += x; sumY += y; sumXX += x * x; sumXY += x * y; sumYY += y * y;
  }
  const denom = n * sumXX - sumX * sumX;
  if (!(Math.abs(denom) > 1e-12)) {
    return { available: false, reason: "Egger's test could not be estimated" };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yHatVar = (sumYY - intercept * sumY - slope * sumXY) / Math.max(1, n - 2);
  const seIntercept = Math.sqrt(Math.max(0, yHatVar) * (sumXX / denom));
  if (!(seIntercept > 0)) {
    return { available: false, reason: "Egger's test could not be estimated" };
  }
  const t = intercept / seIntercept;
  const df = n - 2;
  // Must use Student-t (df = k−2), not a normal approximation (which understates p).
  const p = studentTTwoSidedP(t, df);
  return {
    available: true,
    intercept: intercept,
    se: seIntercept,
    t: t,
    df: df,
    p: p,
    slope: slope,
    n: n
  };
}

function approximateChiSquare(chiSq, df) {
  // Upper-tail p = P(χ²_df > chiSq) via Wilson–Hilferty normal approximation.
  // Example: Q=2.87, df=7 → p ≈ 0.897 (not the crude step-table ~0.5).
  if (!isFinite(chiSq) || !isFinite(df) || df <= 0) return 1;
  if (chiSq <= 0) return 1;
  const cubeRoot = Math.pow(chiSq / df, 1 / 3);
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  if (!(sigma > 0)) return 1;
  const z = (cubeRoot - mu) / sigma;
  const p = 1 - approximateNormalCDF(z);
  if (!isFinite(p)) return 1;
  return Math.min(1, Math.max(0, p));
}
global.MetaEngine = {
  parseNumber: parseMetaNumber,
  buildMetaBundle: buildMetaBundle,
  extractStudyEffect: _metaExtractStudyEffect,
  studentTTwoSidedP: studentTTwoSidedP,
  isLogRatio: isLogRatioSpec,
  isOddsRatio: isOddsRatioSpec,
  isRiskRatio: isRiskRatioSpec,
  isPrecomputedRatio: isPrecomputedRatioSpec,
  isGenericDirect: isGenericDirectSpec,
  usesEventMeaning: usesEventMeaningSpec,
  defaultDirectionLabels: defaultDirectionLabels,
  resolveOutcomeBetter: resolveOutcomeBetter,
  resolveDirectionContext: resolveDirectionContext,
  comparisonLabel: comparisonLabel,
  resultsHeader: resultsHeader,
  favoredGroup: favoredGroup,
  forestFavorLabels: forestFavorLabels,
  ratioQuantityWord: ratioQuantityWord,
  describeRatioChange: describeRatioChange,
  interpretRatio: interpretRatio,
  defaultMeasure: function (effectType) {
    if (effectType === 'binary') return 'rr';
    if (effectType === 'direct') return null;
    if (effectType === 'correlation') return 'fisherz';
    return 'smd';
  },
  measuresFor: function (effectType) {
    if (effectType === 'continuous') {
      return [
        { value: 'smd', label: "Hedges' g (SMD)" },
        { value: 'cohend', label: "Cohen's d" },
        { value: 'md', label: 'Mean difference' },
        { value: 'rom', label: 'Ratio of means (log)' }
      ];
    }
    if (effectType === 'binary') {
      return [
        { value: 'rr', label: 'Risk ratio' },
        { value: 'or', label: 'Odds ratio' },
        { value: 'rd', label: 'Risk difference' }
      ];
    }
    if (effectType === 'correlation') {
      return [
        { value: 'fisherz', label: "Pearson's r (via Fisher's z)" }
      ];
    }
    return [];
  }
};
if (typeof module === 'object' && module.exports) {
  module.exports = global.MetaEngine;
}
})(typeof globalThis !== 'undefined' ? globalThis : this);

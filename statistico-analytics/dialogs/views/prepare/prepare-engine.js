/**
 * Dataset-level preparation engine for Statistico Prepare Data.
 * Analysis-level transforms (univariate ln/z-score, cluster standardise, …)
 * stay in their modules. This engine never mutates the caller’s source arrays.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StatisticoPrepare = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MISSING = null;
  var NEAR_CONSTANT_SHARE = 0.95;
  var SMALL_CATEGORY_N = 5;
  var SMALL_CATEGORY_SHARE = 0.05;
  var PREVIEW_ROW_CAP = 40;
  var EXCEL_NAME_MAX = 31;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function isBlank(v) {
    if (v == null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function cellKey(v) {
    if (isBlank(v)) return '';
    if (typeof v === 'number' && isFinite(v)) return String(v);
    return String(v);
  }

  function asNumber(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      var s = v.trim().replace(/,/g, '');
      if (s === '') return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    }
    return null;
  }

  function isNumericCell(v) {
    return asNumber(v) != null;
  }

  function displayCell(v) {
    if (v == null) return '';
    return v;
  }

  function headerIndex(headers, name) {
    var want = String(name == null ? '' : name).trim().toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i] == null ? '' : headers[i]).trim().toLowerCase() === want) return i;
    }
    return -1;
  }

  function uniqueName(headers, base) {
    var stem = String(base || 'NewVar').replace(/[:\\/?*\[\]]/g, '_').trim() || 'NewVar';
    var names = {};
    headers.forEach(function (h) { names[String(h).toLowerCase()] = true; });
    if (!names[stem.toLowerCase()]) return stem;
    var n = 2;
    while (names[(stem + '_' + n).toLowerCase()]) n++;
    return stem + '_' + n;
  }

  function uniqueSheetName(existingNames, preferred) {
    var base = String(preferred || 'Prepared_Data').replace(/[:\\/?*\[\]]/g, '_').trim() || 'Prepared_Data';
    if (base.length > EXCEL_NAME_MAX) base = base.slice(0, EXCEL_NAME_MAX);
    var taken = {};
    (existingNames || []).forEach(function (n) {
      taken[String(n).toLowerCase()] = true;
    });
    if (!taken[base.toLowerCase()]) return base;
    var i = 2;
    var name;
    do {
      var suffix = '_' + i;
      name = (base.slice(0, EXCEL_NAME_MAX - suffix.length) + suffix);
      i++;
    } while (taken[name.toLowerCase()]);
    return name;
  }

  function codesMatch(v, codes) {
    if (!codes || !codes.length) return false;
    var key = cellKey(v);
    for (var i = 0; i < codes.length; i++) {
      if (key === cellKey(codes[i])) return true;
    }
    return false;
  }

  function isMissing(v, codes) {
    return isBlank(v) || codesMatch(v, codes);
  }

  function normalizeCategory(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function looksLikeDateHeader(name) {
    return /(^|_)(date|dt|time|datetime|dob|day)(_|$)/i.test(String(name || ''));
  }

  function looksLikeIdHeader(name) {
    return /^(id|subject|case|respondent|participant|record)$/i.test(String(name || '').trim());
  }

  function looksLikeTimeHeader(name) {
    return /^(time|wave|occasion|visit|period|t)$/i.test(String(name || '').trim());
  }

  function parseLooseDate(v) {
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    if (typeof v === 'number' && isFinite(v) && v > 20000 && v < 80000) {
      var excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(excelEpoch.getTime() + v * 86400000);
    }
    if (typeof v === 'string') {
      var s = v.trim();
      if (!s) return null;
      if (!/\d/.test(s)) return null;
      if (!/[-/]/.test(s) && !/^\d{8}$/.test(s)) return null;
      var d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function emptyFrame(headers, rows) {
    var emptyRows = [];
    var emptyCols = [];
    (rows || []).forEach(function (row, i) {
      var allBlank = true;
      for (var c = 0; c < headers.length; c++) {
        if (!isBlank(row ? row[c] : null)) { allBlank = false; break; }
      }
      if (allBlank) emptyRows.push(i);
    });
    for (var c = 0; c < headers.length; c++) {
      var allBlankCol = true;
      for (var r = 0; r < rows.length; r++) {
        if (!isBlank(rows[r] ? rows[r][c] : null)) { allBlankCol = false; break; }
      }
      if (allBlankCol) emptyCols.push(headers[c] || ('Column ' + (c + 1)));
    }
    return { emptyRows: emptyRows, emptyCols: emptyCols };
  }

  function profileVariable(headers, rows, col, options) {
    options = options || {};
    var name = headers[col];
    var missingCodes = options.missingCodes || [];
    var n = rows.length;
    var missing = 0;
    var numeric = 0;
    var text = 0;
    var values = [];
    var freq = {};
    var nums = [];
    for (var i = 0; i < n; i++) {
      var v = rows[i] ? rows[i][col] : null;
      if (isMissing(v, missingCodes)) {
        missing++;
        continue;
      }
      values.push(v);
      var key = cellKey(v);
      freq[key] = (freq[key] || 0) + 1;
      if (isNumericCell(v)) {
        numeric++;
        nums.push(asNumber(v));
      } else {
        text++;
      }
    }
    var valid = n - missing;
    var uniqueKeys = Object.keys(freq);
    var maxShare = 0;
    var modeKey = null;
    uniqueKeys.forEach(function (k) {
      var share = freq[k] / Math.max(1, valid);
      if (share > maxShare) { maxShare = share; modeKey = k; }
    });
    return {
      name: name,
      index: col,
      n: n,
      valid: valid,
      missing: missing,
      numeric: numeric,
      text: text,
      unique: uniqueKeys.length,
      freq: freq,
      values: values,
      nums: nums,
      constant: uniqueKeys.length === 1 && valid > 0,
      nearlyConstant: uniqueKeys.length > 1 && maxShare >= NEAR_CONSTANT_SHARE,
      mixedType: numeric > 0 && text > 0,
      modeKey: modeKey,
      maxShare: maxShare
    };
  }

  function detectHarmonizeGroups(profile) {
    var groups = {};
    Object.keys(profile.freq).forEach(function (raw) {
      if (raw === '') return;
      var norm = normalizeCategory(raw);
      if (!norm) return;
      if (!groups[norm]) groups[norm] = [];
      groups[norm].push({ value: raw, n: profile.freq[raw] });
    });
    var candidates = [];
    Object.keys(groups).forEach(function (norm) {
      var items = groups[norm];
      if (items.length < 2) return;
      items.sort(function (a, b) { return b.n - a.n; });
      var canonical = items[0].value.replace(/\s+/g, ' ').trim();
      var variants = items.map(function (it) { return it.value; });
      var safe = variants.every(function (v) {
        return normalizeCategory(v) === norm;
      });
      if (!safe) return;
      candidates.push({
        variable: profile.name,
        canonical: canonical,
        variants: variants,
        mapping: items.reduce(function (acc, it) {
          acc[it.value] = canonical;
          return acc;
        }, {}),
        affected: items.reduce(function (s, it) { return s + it.n; }, 0)
      });
    });
    return candidates;
  }

  function scanQuality(headers, rows, options) {
    options = options || {};
    headers = headers || [];
    rows = rows || [];
    var missingCodes = options.missingCodes || [];
    var issues = [];
    var frame = emptyFrame(headers, rows);
    var nRows = rows.length;
    var nVars = headers.length;

    if (frame.emptyRows.length) {
      issues.push({
        id: 'empty-rows',
        variable: '(rows)',
        issue: 'Empty rows',
        affected: frame.emptyRows.length,
        severity: 'recommended',
        suggested: 'Review and consider a filter that drops completely empty rows.',
        kind: 'empty_rows',
        rowIndexes: frame.emptyRows.slice(0, 50),
        recipeType: 'filter',
        inspect: frame.emptyRows.slice(0, 8).map(function (i) { return { row: i + 2, value: '(empty Excel row)' }; })
      });
    }
    if (frame.emptyCols.length) {
      issues.push({
        id: 'empty-cols',
        variable: frame.emptyCols.join(', '),
        issue: 'Empty columns',
        affected: frame.emptyCols.length,
        severity: 'information',
        suggested: 'Drop these columns from the prepared worksheet. The source sheet is not changed.',
        kind: 'empty_cols',
        recipeType: 'dropVariables',
        variables: frame.emptyCols.slice(),
        inspect: frame.emptyCols.map(function (name) { return { row: '', value: name }; })
      });
    }

    var rowKeys = {};
    rows.forEach(function (row, i) {
      if (frame.emptyRows.indexOf(i) >= 0) return;
      var key = headers.map(function (_h, c) { return cellKey(row ? row[c] : null); }).join('\u0001');
      if (!rowKeys[key]) rowKeys[key] = [];
      rowKeys[key].push(i);
    });
    var dupGroups = Object.keys(rowKeys).filter(function (k) { return rowKeys[k].length > 1; });
    if (dupGroups.length) {
      var dupCount = dupGroups.reduce(function (s, k) { return s + rowKeys[k].length; }, 0);
      issues.push({
        id: 'duplicate-rows',
        variable: '(rows)',
        issue: 'Duplicate rows',
        affected: dupCount,
        severity: 'recommended',
        suggested: 'Flag duplicate rows in the prepared worksheet. Do not delete automatically.',
        kind: 'duplicate_rows',
        recipeType: 'flagDuplicates',
        inspect: dupGroups.slice(0, 6).map(function (k) {
          return { row: rowKeys[k].map(function (i) { return i + 2; }).join(', '), value: 'identical data rows' };
        })
      });
    }

    var idCol = headers.findIndex(looksLikeIdHeader);
    var timeCol = headers.findIndex(looksLikeTimeHeader);
    if (idCol >= 0 && timeCol >= 0) {
      var st = {};
      rows.forEach(function (row, i) {
        if (isBlank(row[idCol]) || isBlank(row[timeCol])) return;
        var k = cellKey(row[idCol]) + '\u0001' + cellKey(row[timeCol]);
        if (!st[k]) st[k] = [];
        st[k].push(i);
      });
      var stDup = Object.keys(st).filter(function (k) { return st[k].length > 1; });
      if (stDup.length) {
        issues.push({
          id: 'dup-subject-time',
          variable: headers[idCol] + ' × ' + headers[timeCol],
          issue: 'Duplicate subject–time combinations',
          affected: stDup.reduce(function (s, k) { return s + st[k].length; }, 0),
          severity: 'required',
          suggested: 'Repeated-measures analyses need one row per subject and occasion.',
          kind: 'duplicate_subject_time',
          inspect: stDup.slice(0, 8).map(function (k) {
            var parts = k.split('\u0001');
            return { row: st[k].map(function (i) { return i + 1; }).join(', '), value: parts[0] + ' / ' + parts[1] };
          })
        });
      }
    }

    headers.forEach(function (_h, col) {
      var p = profileVariable(headers, rows, col, { missingCodes: missingCodes });
      if (p.missing > 0) {
        issues.push({
          id: 'missing-' + col,
          variable: p.name,
          issue: 'Missing values',
          affected: p.missing,
          severity: p.missing / Math.max(1, p.n) >= 0.2 ? 'recommended' : 'information',
          suggested: 'Define missing-value codes if blanks are coded (e.g. 99), or filter incomplete cases.',
          kind: 'missing',
          recipeType: 'defineMissing',
          inspect: [{ row: '', value: p.missing + ' of ' + p.n + ' cases' }]
        });
      }
      if (missingCodes.length) {
        var coded = 0;
        rows.forEach(function (row) {
          if (codesMatch(row[col], missingCodes)) coded++;
        });
        if (coded > 0) {
          issues.push({
            id: 'missing-codes-' + col,
            variable: p.name,
            issue: 'User-defined missing-value codes',
            affected: coded,
            severity: 'recommended',
            suggested: 'Treat the listed codes as missing in the prepared worksheet.',
            kind: 'missing_codes',
            recipeType: 'defineMissing',
            inspect: missingCodes.map(function (c) { return { row: '', value: String(c) }; })
          });
        }
      }
      if (p.mixedType) {
        issues.push({
          id: 'mixed-' + col,
          variable: p.name,
          issue: 'Mixed numeric and text values',
          affected: p.text,
          severity: 'required',
          suggested: 'Recode text codes or split the variable before numeric analyses.',
          kind: 'mixed_type',
          inspect: Object.keys(p.freq).filter(function (k) { return asNumber(k) == null; }).slice(0, 8)
            .map(function (k) { return { row: '', value: k + ' (' + p.freq[k] + ')' }; })
        });
      }
      if (p.constant) {
        issues.push({
          id: 'constant-' + col,
          variable: p.name,
          issue: 'Constant variable',
          affected: p.valid,
          severity: 'information',
          suggested: 'A constant variable cannot discriminate cases or enter most models.',
          kind: 'constant',
          inspect: [{ row: '', value: p.modeKey }]
        });
      } else if (p.nearlyConstant) {
        issues.push({
          id: 'near-constant-' + col,
          variable: p.name,
          issue: 'Nearly constant variable',
          affected: Math.round(p.maxShare * p.valid),
          severity: 'information',
          suggested: 'Almost all cases share one value — check coding and rare categories.',
          kind: 'nearly_constant',
          inspect: [{ row: '', value: p.modeKey + ' (' + Math.round(p.maxShare * 100) + '%)' }]
        });
      }
      var harm = detectHarmonizeGroups(p);
      harm.forEach(function (g, gi) {
        issues.push({
          id: 'harmonize-' + col + '-' + gi,
          variable: p.name,
          issue: 'Inconsistent category labels',
          affected: g.affected,
          severity: 'recommended',
          suggested: 'Map ' + g.variants.map(function (v) { return '“' + v + '”'; }).join(', ') + ' → “' + g.canonical + '” after review.',
          kind: 'inconsistent_categories',
          recipeType: 'harmonize',
          mapping: g.mapping,
          canonical: g.canonical,
          variants: g.variants,
          inspect: g.variants.map(function (v) { return { row: '', value: v }; })
        });
      });
      if (p.text > 0 && p.numeric === 0 && p.unique >= 2) {
        Object.keys(p.freq).forEach(function (k) {
          if (p.freq[k] > 0 && p.freq[k] < SMALL_CATEGORY_N && p.freq[k] / Math.max(1, p.valid) < SMALL_CATEGORY_SHARE) {
            issues.push({
              id: 'small-cat-' + col + '-' + k,
              variable: p.name,
              issue: 'Very small category',
              affected: p.freq[k],
              severity: 'information',
              suggested: 'Small cells weaken chi-square and logistic models. Consider recoding after review.',
              kind: 'small_category',
              inspect: [{ row: '', value: k + ' (n=' + p.freq[k] + ')' }]
            });
          }
        });
      }
      if (looksLikeDateHeader(p.name) || (p.text > 0 && p.values.some(function (v) { return parseLooseDate(v); }))) {
        var badDates = 0;
        var samples = [];
        rows.forEach(function (row, i) {
          var v = row[col];
          if (isMissing(v, missingCodes)) return;
          if (isNumericCell(v) && !looksLikeDateHeader(p.name)) return;
          if (!parseLooseDate(v) && !isNumericCell(v)) {
            badDates++;
            if (samples.length < 6) samples.push({ row: i + 1, value: cellKey(v) });
          }
        });
        if (badDates > 0 && looksLikeDateHeader(p.name)) {
          issues.push({
            id: 'bad-dates-' + col,
            variable: p.name,
            issue: 'Invalid dates',
            affected: badDates,
            severity: 'required',
            suggested: 'Correct unparseable date values in Excel, then rescan.',
            kind: 'invalid_dates',
            inspect: samples
          });
        }
      }
      if (options.numericRanges && options.numericRanges[p.name]) {
        var rng = options.numericRanges[p.name];
        var out = 0;
        var outSamples = [];
        rows.forEach(function (row, i) {
          var n = asNumber(row[col]);
          if (n == null) return;
          if ((rng.min != null && n < rng.min) || (rng.max != null && n > rng.max)) {
            out++;
            if (outSamples.length < 6) outSamples.push({ row: i + 1, value: n });
          }
        });
        if (out) {
          issues.push({
            id: 'range-' + col,
            variable: p.name,
            issue: 'Invalid numeric range',
            affected: out,
            severity: 'required',
            suggested: 'Values fall outside the expected range for this variable.',
            kind: 'invalid_range',
            inspect: outSamples
          });
        }
      }
    });

    var required = issues.filter(function (x) { return x.severity === 'required'; }).length;
    var recommended = issues.filter(function (x) { return x.severity === 'recommended'; }).length;
    var information = issues.filter(function (x) { return x.severity === 'information'; }).length;
    var status = required ? 'issues-found' : (recommended ? 'review' : 'ok');
    return {
      status: status,
      rowsScanned: nRows,
      variablesScanned: nVars,
      errors: required,
      warnings: recommended,
      information: information,
      issues: issues,
      emptyRows: frame.emptyRows.length,
      emptyColumns: frame.emptyCols.length
    };
  }

  function issueToRecipeStep(issue) {
    if (!issue || !issue.recipeType) return null;
    if (issue.recipeType === 'harmonize') {
      return {
        type: 'harmonize',
        variables: [issue.variable],
        mapping: issue.mapping || {},
        enabled: true
      };
    }
    if (issue.recipeType === 'flagDuplicates') {
      return { type: 'flagDuplicates', flagName: 'duplicate_flag', enabled: true };
    }
    if (issue.recipeType === 'defineMissing') {
      return { type: 'defineMissing', variables: [issue.variable], codes: [], enabled: true };
    }
    if (issue.recipeType === 'dropVariables') {
      var dropNames = issue.variables && issue.variables.length
        ? issue.variables.slice()
        : String(issue.variable || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      return { type: 'dropVariables', variables: dropNames, enabled: true };
    }
    if (issue.recipeType === 'filter' && issue.kind === 'empty_rows') {
      return {
        type: 'filter',
        logic: 'and',
        conditions: [{ op: 'is_not_empty_row' }],
        enabled: true
      };
    }
    return null;
  }

  function makeDataset(headers, rows) {
    return {
      headers: (headers || []).slice(),
      rows: (rows || []).map(function (r) { return (r || []).slice(); }),
      warnings: [],
      newVariables: [],
      excludedCount: 0,
      structural: false
    };
  }

  function describeStep(step, result) {
    if (!step) return '';
    var n = result && result.casesAffected != null ? result.casesAffected : null;
    var vars = (step.variables || []).join(', ');
    switch (step.type) {
      case 'defineMissing':
        return 'Defined ' + (step.codes || []).join(', ') + ' as missing' + (vars ? ' for ' + vars : '');
      case 'recode':
        return 'Recoded ' + (step.source || vars) + ' into ' + (step.outputName || 'new variable');
      case 'compute':
        return 'Computed ' + (step.outputName || 'new variable') + ' = ' + (step.formula || '');
      case 'reverseScore':
        return 'Reverse-scored ' + vars + ' using ' + step.min + ' + ' + step.max + ' − original';
      case 'composite':
        return 'Created ' + (step.outputName || 'score') + ' = ' + (step.method || 'mean') + '(' + vars + ')';
      case 'harmonize':
        return 'Harmonized category labels' + (vars ? ' for ' + vars : '');
      case 'filter':
        return 'Filtered cases (' + (n != null ? n + ' excluded' : 'condition applied') + ')';
      case 'flagDuplicates':
        return 'Flagged duplicate rows as ' + (step.flagName || 'duplicate_flag');
      case 'wideToLong':
        return 'Reshaped ' + (step.measureVars || []).join(', ') + ' into long format';
      case 'dropVariables':
        return 'Dropped ' + (vars || 'selected variables') + ' from the prepared worksheet';
      default:
        return step.type || 'Preparation step';
    }
  }

  function applyDefineMissing(ds, step) {
    var idxs = (step.variables || []).map(function (v) { return headerIndex(ds.headers, v); }).filter(function (i) { return i >= 0; });
    var codes = step.codes || [];
    var affected = 0;
    ds.rows.forEach(function (row) {
      idxs.forEach(function (i) {
        if (codesMatch(row[i], codes)) {
          row[i] = MISSING;
          affected++;
        }
      });
    });
    return { casesAffected: affected, cellsAffected: affected };
  }

  function valueInRange(n, range) {
    if (n == null || !range) return false;
    var lo = range.min;
    var hi = range.max;
    if (lo != null && n < lo) return false;
    if (hi != null && n > hi) return false;
    return true;
  }

  function applyRecode(ds, step) {
    var src = headerIndex(ds.headers, step.source || (step.variables && step.variables[0]));
    if (src < 0) return { error: 'Source variable not found.', casesAffected: 0 };
    var name = uniqueName(ds.headers, step.outputName || (ds.headers[src] + '_recode'));
    ds.headers.push(name);
    ds.newVariables.push(name);
    var map = step.mapping || {};
    var ranges = step.ranges || [];
    var otherwise = step.otherwise; // 'keep' | 'missing' | value
    var unmatched = 0;
    var affected = 0;
    ds.rows.forEach(function (row) {
      var v = row[src];
      var out;
      var key = cellKey(v);
      if (Object.prototype.hasOwnProperty.call(map, key) || Object.prototype.hasOwnProperty.call(map, v)) {
        out = map[key] != null ? map[key] : map[v];
        if (out === '__missing__') out = MISSING;
        affected++;
      } else {
        var n = asNumber(v);
        var hit = false;
        for (var i = 0; i < ranges.length; i++) {
          if (valueInRange(n, ranges[i])) {
            out = ranges[i].to === '__missing__' ? MISSING : ranges[i].to;
            hit = true;
            affected++;
            break;
          }
        }
        if (!hit) {
          unmatched++;
          if (otherwise === 'missing' || otherwise === '__missing__') out = MISSING;
          else if (otherwise != null && otherwise !== 'keep') out = otherwise;
          else out = v;
        }
      }
      row.push(out);
    });
    return { casesAffected: affected, unmatched: unmatched, outputName: name };
  }

  var FUNC_ARITY = { abs: 1, round: 1, min: 0, max: 0, mean: 0, sum: 0, if: 3 };

  function tokenizeFormula(src) {
    var s = String(src || '');
    var tokens = [];
    var i = 0;
    function isIdentStart(ch) { return /[A-Za-z_]/.test(ch); }
    function isIdent(ch) { return /[A-Za-z0-9_]/.test(ch); }
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '[' ) {
        var j = s.indexOf(']', i);
        if (j < 0) throw new Error('Unclosed [variable] name.');
        tokens.push({ t: 'ident', v: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        var q = ch;
        var k = i + 1;
        var buf = '';
        while (k < s.length && s[k] !== q) { buf += s[k]; k++; }
        if (k >= s.length) throw new Error('Unclosed string.');
        tokens.push({ t: 'string', v: buf });
        i = k + 1;
        continue;
      }
      if (/[0-9.]/.test(ch) && (ch !== '.' || /[0-9]/.test(s[i + 1] || ''))) {
        var m = s.slice(i).match(/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/);
        tokens.push({ t: 'number', v: Number(m[0]) });
        i += m[0].length;
        continue;
      }
      if (s.slice(i, i + 2) === '<>' || s.slice(i, i + 2) === '<=' || s.slice(i, i + 2) === '>=' || s.slice(i, i + 2) === '==') {
        tokens.push({ t: 'op', v: s.slice(i, i + 2) === '==' ? '=' : s.slice(i, i + 2) });
        i += 2;
        continue;
      }
      if ('+-*/()<>=,'.indexOf(ch) >= 0) {
        tokens.push({ t: ch === ',' ? 'comma' : (ch === '(' || ch === ')' ? ch : 'op'), v: ch });
        i++;
        continue;
      }
      if (isIdentStart(ch)) {
        var p = i + 1;
        while (p < s.length && isIdent(s[p])) p++;
        var word = s.slice(i, p);
        var lw = word.toLowerCase();
        if (lw === 'and' || lw === 'or') tokens.push({ t: 'op', v: lw });
        else if (FUNC_ARITY[lw] != null) tokens.push({ t: 'func', v: lw });
        else tokens.push({ t: 'ident', v: word });
        i = p;
        continue;
      }
      throw new Error('Unexpected character "' + ch + '" in formula.');
    }
    tokens.push({ t: 'eof' });
    return tokens;
  }

  function parseFormula(src, headers) {
    var tokens;
    try { tokens = tokenizeFormula(src); }
    catch (e) { return { ok: false, error: e.message }; }
    var pos = 0;
    function peek() { return tokens[pos]; }
    function eat(t) {
      var tok = tokens[pos];
      if (t && tok.t !== t && tok.v !== t) return null;
      pos++;
      return tok;
    }
    function parseOr() {
      var node = parseAnd();
      while (peek().t === 'op' && peek().v === 'or') {
        eat();
        node = { type: 'binop', op: 'or', left: node, right: parseAnd() };
      }
      return node;
    }
    function parseAnd() {
      var node = parseCmp();
      while (peek().t === 'op' && peek().v === 'and') {
        eat();
        node = { type: 'binop', op: 'and', left: node, right: parseCmp() };
      }
      return node;
    }
    function parseCmp() {
      var node = parseAdd();
      if (peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].indexOf(peek().v) >= 0) {
        var op = eat().v;
        node = { type: 'binop', op: op, left: node, right: parseAdd() };
      }
      return node;
    }
    function parseAdd() {
      var node = parseMul();
      while (peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        var op = eat().v;
        node = { type: 'binop', op: op, left: node, right: parseMul() };
      }
      return node;
    }
    function parseMul() {
      var node = parseUnary();
      while (peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
        var op = eat().v;
        node = { type: 'binop', op: op, left: node, right: parseUnary() };
      }
      return node;
    }
    function parseUnary() {
      if (peek().t === 'op' && peek().v === '-') {
        eat();
        return { type: 'unary', op: '-', arg: parseUnary() };
      }
      return parsePrimary();
    }
    function parsePrimary() {
      var tok = peek();
      if (tok.t === 'number') { eat(); return { type: 'num', v: tok.v }; }
      if (tok.t === 'string') { eat(); return { type: 'str', v: tok.v }; }
      if (tok.t === 'func') {
        var fn = eat().v;
        if (!eat('(')) throw new Error('Expected ( after ' + fn + '.');
        var args = [];
        if (peek().t !== ')') {
          args.push(parseOr());
          while (peek().t === 'comma') { eat(); args.push(parseOr()); }
        }
        if (!eat(')')) throw new Error('Expected ) after ' + fn + ' arguments.');
        if (fn === 'if' && args.length !== 3) throw new Error('if() needs three arguments: if(condition, then, else).');
        if ((fn === 'abs' || fn === 'round') && args.length !== 1) throw new Error(fn + '() needs one argument.');
        return { type: 'call', fn: fn, args: args };
      }
      if (tok.t === 'ident') {
        eat();
        if (headerIndex(headers, tok.v) < 0) throw new Error('Unknown variable "' + tok.v + '". Use names from the variable list, or wrap spaces in [brackets].');
        return { type: 'var', name: tok.v };
      }
      if (tok.t === '(') {
        eat();
        var inner = parseOr();
        if (!eat(')')) throw new Error('Expected closing ).');
        return inner;
      }
      throw new Error('Unexpected token in formula.');
    }
    try {
      if (!String(src || '').trim()) return { ok: false, error: 'Enter a formula.' };
      var ast = parseOr();
      if (peek().t !== 'eof') return { ok: false, error: 'Unexpected extra text in formula.' };
      return { ok: true, ast: ast };
    } catch (err) {
      return { ok: false, error: err.message || 'Invalid formula.' };
    }
  }

  function truthy(v) {
    if (v == null) return false;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'boolean') return v;
    return String(v).trim() !== '';
  }

  function evalAst(ast, env) {
    if (!ast) return MISSING;
    switch (ast.type) {
      case 'num': return ast.v;
      case 'str': return ast.v;
      case 'var': {
        var v = env[ast.name];
        if (v == null) {
          var idxName = Object.keys(env).find(function (k) {
            return k.toLowerCase() === String(ast.name).toLowerCase();
          });
          v = idxName != null ? env[idxName] : MISSING;
        }
        return v;
      }
      case 'unary': {
        var a = evalAst(ast.arg, env);
        var n = asNumber(a);
        return n == null ? MISSING : -n;
      }
      case 'binop': {
        var L = evalAst(ast.left, env);
        var R = evalAst(ast.right, env);
        if (ast.op === 'and') return truthy(L) && truthy(R);
        if (ast.op === 'or') return truthy(L) || truthy(R);
        if (ast.op === '=') return cellKey(L) === cellKey(R);
        if (ast.op === '<>') return cellKey(L) !== cellKey(R);
        var ln = asNumber(L);
        var rn = asNumber(R);
        if (ln == null || rn == null) return MISSING;
        if (ast.op === '+') return ln + rn;
        if (ast.op === '-') return ln - rn;
        if (ast.op === '*') return ln * rn;
        if (ast.op === '/') return rn === 0 ? MISSING : ln / rn;
        if (ast.op === '<') return ln < rn;
        if (ast.op === '>') return ln > rn;
        if (ast.op === '<=') return ln <= rn;
        if (ast.op === '>=') return ln >= rn;
        return MISSING;
      }
      case 'call': {
        if (ast.fn === 'if') {
          return truthy(evalAst(ast.args[0], env)) ? evalAst(ast.args[1], env) : evalAst(ast.args[2], env);
        }
        var nums = ast.args.map(function (arg) { return asNumber(evalAst(arg, env)); }).filter(function (x) { return x != null; });
        if (ast.fn === 'abs') return nums.length ? Math.abs(nums[0]) : MISSING;
        if (ast.fn === 'round') return nums.length ? Math.round(nums[0]) : MISSING;
        if (!nums.length) return MISSING;
        if (ast.fn === 'min') return Math.min.apply(null, nums);
        if (ast.fn === 'max') return Math.max.apply(null, nums);
        if (ast.fn === 'sum') return nums.reduce(function (s, x) { return s + x; }, 0);
        if (ast.fn === 'mean') return nums.reduce(function (s, x) { return s + x; }, 0) / nums.length;
        return MISSING;
      }
      default: return MISSING;
    }
  }

  function validateFormula(formula, headers) {
    return parseFormula(formula, headers || []);
  }

  function applyCompute(ds, step) {
    var parsed = parseFormula(step.formula, ds.headers);
    if (!parsed.ok) return { error: parsed.error, casesAffected: 0 };
    var name = uniqueName(ds.headers, step.outputName || 'computed');
    ds.headers.push(name);
    ds.newVariables.push(name);
    var invalid = 0;
    ds.rows.forEach(function (row) {
      var env = {};
      ds.headers.forEach(function (h, i) {
        if (i < row.length) env[h] = row[i];
      });
      var val = evalAst(parsed.ast, env);
      if (val == null || (typeof val === 'number' && !isFinite(val))) {
        invalid++;
        val = MISSING;
      }
      row.push(val);
    });
    return { casesAffected: ds.rows.length - invalid, invalid: invalid, outputName: name };
  }

  function applyReverseScore(ds, step) {
    var min = Number(step.min);
    var max = Number(step.max);
    if (!isFinite(min) || !isFinite(max)) return { error: 'Scale minimum and maximum are required.', casesAffected: 0 };
    var pattern = step.pattern || '{name}_r';
    var affected = 0;
    (step.variables || []).forEach(function (vName) {
      var src = headerIndex(ds.headers, vName);
      if (src < 0) return;
      var outName = uniqueName(ds.headers, String(pattern).replace('{name}', vName));
      ds.headers.push(outName);
      ds.newVariables.push(outName);
      ds.rows.forEach(function (row) {
        var n = asNumber(row[src]);
        if (n == null) {
          row.push(MISSING);
        } else {
          row.push(min + max - n);
          affected++;
        }
      });
    });
    return { casesAffected: affected, formula: 'reversed = minimum + maximum − original' };
  }

  function applyComposite(ds, step) {
    var idxs = (step.variables || []).map(function (v) { return headerIndex(ds.headers, v); }).filter(function (i) { return i >= 0; });
    if (!idxs.length) return { error: 'Select at least one item.', casesAffected: 0 };
    var minValid = step.minValid != null ? Number(step.minValid) : idxs.length;
    if (!isFinite(minValid) || minValid < 1) minValid = 1;
    var method = step.method === 'sum' ? 'sum' : 'mean';
    var name = uniqueName(ds.headers, step.outputName || (method === 'sum' ? 'score_sum' : 'score_mean'));
    ds.headers.push(name);
    ds.newVariables.push(name);
    var scored = 0;
    ds.rows.forEach(function (row) {
      var vals = [];
      idxs.forEach(function (i) {
        var n = asNumber(row[i]);
        if (n != null) vals.push(n);
      });
      if (vals.length < minValid) {
        row.push(MISSING);
      } else {
        var s = vals.reduce(function (a, b) { return a + b; }, 0);
        row.push(method === 'sum' ? s : s / vals.length);
        scored++;
      }
    });
    return { casesAffected: scored, outputName: name };
  }

  function applyHarmonize(ds, step) {
    var mapping = step.mapping || {};
    var names = (step.variables && step.variables.length)
      ? step.variables
      : (step.variable ? [step.variable] : ds.headers);
    var idxs = names
      .map(function (v) { return headerIndex(ds.headers, v); })
      .filter(function (i) { return i >= 0; });
    var affected = 0;
    ds.rows.forEach(function (row) {
      idxs.forEach(function (i) {
        var key = cellKey(row[i]);
        if (Object.prototype.hasOwnProperty.call(mapping, key)) {
          var next = mapping[key];
          if (cellKey(row[i]) !== cellKey(next)) {
            row[i] = next;
            affected++;
          }
        } else if (Object.prototype.hasOwnProperty.call(mapping, row[i])) {
          row[i] = mapping[row[i]];
          affected++;
        }
      });
    });
    return { casesAffected: affected };
  }

  function rowMatchesCondition(row, headers, cond) {
    if (cond.op === 'is_not_empty_row') {
      return headers.some(function (_h, i) { return !isBlank(row[i]); });
    }
    var i = headerIndex(headers, cond.variable);
    if (i < 0) return false;
    var v = row[i];
    var op = cond.op;
    if (op === 'is_missing') return isBlank(v);
    if (op === 'is_not_missing') return !isBlank(v);
    if (op === 'equals') return cellKey(v) === cellKey(cond.value);
    if (op === 'not_equals') return cellKey(v) !== cellKey(cond.value);
    if (op === 'contains') return String(v == null ? '' : v).toLowerCase().indexOf(String(cond.value || '').toLowerCase()) >= 0;
    var n = asNumber(v);
    var a = asNumber(cond.value);
    var b = asNumber(cond.value2);
    if (op === 'gt') return n != null && a != null && n > a;
    if (op === 'lt') return n != null && a != null && n < a;
    if (op === 'between') {
      if (b == null && typeof cond.value === 'string') {
        var parts = String(cond.value).split(/[,\-–]/);
        if (parts.length >= 2) {
          a = asNumber(parts[0]);
          b = asNumber(parts[1]);
        }
      }
      return n != null && a != null && b != null && n >= Math.min(a, b) && n <= Math.max(a, b);
    }
    return false;
  }

  function applyFilter(ds, step) {
    var conds = step.conditions || [];
    var logic = step.logic === 'or' ? 'or' : 'and';
    var kept = [];
    ds.rows.forEach(function (row) {
      if (!conds.length) { kept.push(row); return; }
      var ok = logic === 'and';
      for (var i = 0; i < conds.length; i++) {
        var m = rowMatchesCondition(row, ds.headers, conds[i]);
        if (logic === 'and') { if (!m) { ok = false; break; } }
        else if (m) { ok = true; break; }
        else ok = false;
      }
      if (ok) kept.push(row);
    });
    var excluded = ds.rows.length - kept.length;
    ds.rows = kept;
    ds.excludedCount += excluded;
    return {
      casesAffected: excluded,
      retained: kept.length,
      excluded: excluded,
      pctRetained: ds.rows.length + excluded === 0 ? 0 : (kept.length / (kept.length + excluded)) * 100
    };
  }

  function applyFlagDuplicates(ds, step) {
    var name = uniqueName(ds.headers, step.flagName || 'duplicate_flag');
    ds.headers.push(name);
    ds.newVariables.push(name);
    var seen = {};
    var flagged = 0;
    ds.rows.forEach(function (row) {
      var key = ds.headers.slice(0, -1).map(function (_h, c) { return cellKey(row[c]); }).join('\u0001');
      if (seen[key]) {
        row.push(1);
        flagged++;
      } else {
        seen[key] = true;
        row.push(0);
      }
    });
    return { casesAffected: flagged, outputName: name };
  }

  function applyWideToLong(ds, step) {
    var idIdx = headerIndex(ds.headers, step.idVar);
    var measureVars = step.measureVars || [];
    var measureIdx = measureVars.map(function (v) { return headerIndex(ds.headers, v); });
    if (measureIdx.some(function (i) { return i < 0; }) || !measureVars.length) {
      return { error: 'Select the repeated-measure columns to reshape.', casesAffected: 0 };
    }
    var timeName = step.timeName || 'Occasion';
    var valueName = step.valueName || 'Value';
    var keepIdx = ds.headers.map(function (_h, i) { return i; }).filter(function (i) {
      return i !== idIdx && measureIdx.indexOf(i) < 0;
    });
    if (idIdx >= 0) keepIdx = [idIdx].concat(keepIdx.filter(function (i) { return i !== idIdx; }));
    var newHeaders = keepIdx.map(function (i) { return ds.headers[i]; }).concat([timeName, valueName]);
    var newRows = [];
    ds.rows.forEach(function (row) {
      measureVars.forEach(function (mv, mi) {
        var nr = keepIdx.map(function (i) { return row[i]; });
        nr.push(mv);
        nr.push(row[measureIdx[mi]]);
        newRows.push(nr);
      });
    });
    var nOld = ds.rows.length;
    ds.headers = newHeaders;
    ds.rows = newRows;
    ds.structural = true;
    ds.newVariables.push(timeName, valueName);
    return { casesAffected: newRows.length, outputRows: newRows.length, inputRows: nOld };
  }

  function applyDropVariables(ds, step) {
    var drop = {};
    (step.variables || []).forEach(function (v) {
      var i = headerIndex(ds.headers, v);
      if (i >= 0) drop[i] = true;
    });
    var keepIdx = [];
    ds.headers.forEach(function (_h, i) {
      if (!drop[i]) keepIdx.push(i);
    });
    if (!keepIdx.length) return { error: 'At least one variable must remain.', casesAffected: 0 };
    if (keepIdx.length === ds.headers.length) {
      return { error: 'None of the selected variables were found.', casesAffected: 0 };
    }
    var dropped = ds.headers.length - keepIdx.length;
    ds.headers = keepIdx.map(function (i) { return ds.headers[i]; });
    ds.rows = ds.rows.map(function (row) {
      return keepIdx.map(function (i) { return row ? row[i] : MISSING; });
    });
    ds.structural = true;
    return { casesAffected: dropped, variablesDropped: dropped };
  }

  var OPERATORS = {
    defineMissing: applyDefineMissing,
    recode: applyRecode,
    compute: applyCompute,
    reverseScore: applyReverseScore,
    composite: applyComposite,
    harmonize: applyHarmonize,
    filter: applyFilter,
    flagDuplicates: applyFlagDuplicates,
    wideToLong: applyWideToLong,
    dropVariables: applyDropVariables
  };

  function validateStep(step, headers) {
    if (!step || !step.type) return { ok: false, error: 'Choose an operation.' };
    if (!OPERATORS[step.type]) return { ok: false, error: 'This operation is not available yet.' };
    if (step.type === 'defineMissing') {
      if (!(step.variables || []).length) return { ok: false, error: 'Select at least one variable.' };
      if (!(step.codes || []).length) return { ok: false, error: 'Enter at least one missing-value code.' };
    }
    if (step.type === 'recode') {
      if (!step.source && !(step.variables || []).length) return { ok: false, error: 'Select a source variable.' };
      if (!step.outputName) return { ok: false, error: 'Name the new variable.' };
      var hasMap = step.mapping && Object.keys(step.mapping).length;
      var hasRanges = step.ranges && step.ranges.length;
      if (!hasMap && !hasRanges) return { ok: false, error: 'Add at least one recode rule.' };
    }
    if (step.type === 'compute') {
      if (!step.outputName) return { ok: false, error: 'Name the new variable.' };
      var vf = validateFormula(step.formula, headers);
      if (!vf.ok) return vf;
    }
    if (step.type === 'reverseScore') {
      if (!(step.variables || []).length) return { ok: false, error: 'Select items to reverse-score.' };
      if (!isFinite(Number(step.min)) || !isFinite(Number(step.max))) {
        return { ok: false, error: 'Enter the scale minimum and maximum.' };
      }
    }
    if (step.type === 'composite') {
      if (!(step.variables || []).length) return { ok: false, error: 'Select items for the composite score.' };
      if (!step.outputName) return { ok: false, error: 'Name the new score variable.' };
    }
    if (step.type === 'harmonize') {
      if (!step.mapping || !Object.keys(step.mapping).length) return { ok: false, error: 'Approve a category mapping first.' };
    }
    if (step.type === 'filter') {
      if (!(step.conditions || []).length) return { ok: false, error: 'Add at least one filter condition.' };
      for (var fi = 0; fi < step.conditions.length; fi++) {
        var cond = step.conditions[fi];
        if (cond.op === 'is_not_empty_row') continue;
        if (!cond.variable || headerIndex(headers, cond.variable) < 0) {
          return { ok: false, error: 'Filter variable "' + (cond.variable || '') + '" is not in the current dataset. Recalculate earlier steps first.' };
        }
      }
    }
    if (step.type === 'wideToLong') {
      if (!(step.measureVars || []).length) return { ok: false, error: 'Select repeated-measure columns.' };
      if (!step.timeName || !step.valueName) return { ok: false, error: 'Name the new occasion and measurement variables.' };
    }
    if (step.type === 'dropVariables') {
      if (!(step.variables || []).length) return { ok: false, error: 'Select at least one variable to drop.' };
      var dropIdx = {};
      (step.variables || []).forEach(function (v) {
        var i = headerIndex(headers, v);
        if (i >= 0) dropIdx[i] = true;
      });
      var nDrop = Object.keys(dropIdx).length;
      if (!nDrop) return { ok: false, error: 'Select at least one variable that is in the dataset.' };
      if (nDrop >= (headers || []).length) return { ok: false, error: 'At least one variable must remain.' };
    }
    return { ok: true };
  }

  function applyStep(ds, step) {
    var fn = OPERATORS[step.type];
    if (!fn) return { error: 'Unknown operation.', casesAffected: 0 };
    return fn(ds, step);
  }

  function applyRecipe(headers, rows, steps, options) {
    options = options || {};
    var ds = makeDataset(headers, rows);
    var report = [];
    (steps || []).forEach(function (step, idx) {
      var rec = {
        index: idx,
        stepNumber: idx + 1,
        type: step.type,
        enabled: step.enabled !== false,
        variables: step.variables || (step.source ? [step.source] : (step.measureVars || [])),
        description: describeStep(step),
        status: 'skipped',
        casesAffected: 0
      };
      if (step.enabled === false) {
        rec.status = 'disabled';
        report.push(rec);
        return;
      }
      var valid = validateStep(step, ds.headers);
      if (!valid.ok) {
        rec.status = 'error';
        rec.error = valid.error;
        rec.description = describeStep(step);
        ds.warnings.push(valid.error);
        report.push(rec);
        if (options.stopOnError) return;
        return;
      }
      var result = applyStep(ds, step);
      rec.casesAffected = result.casesAffected || 0;
      rec.description = describeStep(step, result);
      rec.outputName = result.outputName;
      rec.unmatched = result.unmatched;
      rec.retained = result.retained;
      rec.excluded = result.excluded;
      rec.pctRetained = result.pctRetained;
      if (result.error) {
        rec.status = 'error';
        rec.error = result.error;
        ds.warnings.push(result.error);
      } else {
        rec.status = 'applied';
        if (result.unmatched) ds.warnings.push(result.unmatched + ' values did not match a recode rule.');
        if (result.retained === 0 && step.type === 'filter') {
          ds.warnings.push('This filter retains 0 cases. The prepared worksheet would be empty.');
        }
      }
      report.push(rec);
    });
    return {
      headers: ds.headers,
      rows: ds.rows,
      steps: report,
      warnings: ds.warnings,
      newVariables: ds.newVariables,
      excludedCount: ds.excludedCount,
      structural: ds.structural,
      nRows: ds.rows.length,
      nVars: ds.headers.length
    };
  }

  function previewRecipe(headers, rows, steps, options) {
    options = options || {};
    var applied = applyRecipe(headers, rows, steps, options);
    var changedOnly = !!options.changedOnly;
    var original = makeDataset(headers, rows);
    var diffs = [];
    var maxRows = Math.min(PREVIEW_ROW_CAP, Math.max(original.rows.length, applied.rows.length));
    if (applied.structural) {
      for (var r = 0; r < Math.min(PREVIEW_ROW_CAP, applied.rows.length); r++) {
        diffs.push({
          row: r + 1,
          status: 'reshaped',
          original: '',
          proposed: applied.rows[r],
          headers: applied.headers
        });
      }
    } else {
      var n = Math.min(original.rows.length, applied.rows.length);
      for (var i = 0; i < n; i++) {
        var o = original.rows[i] || [];
        var p = applied.rows[i] || [];
        var cells = [];
        var changed = false;
        var colCount = Math.max(original.headers.length, applied.headers.length);
        for (var c = 0; c < colCount; c++) {
          var ov = c < original.headers.length ? o[c] : undefined;
          var pv = p[c];
          var isNew = c >= original.headers.length;
          var cellChanged = isNew || cellKey(ov) !== cellKey(pv);
          if (cellChanged) changed = true;
          cells.push({ original: displayCell(ov), proposed: displayCell(pv), changed: cellChanged, isNew: isNew });
        }
        if (!changedOnly || changed) {
          diffs.push({ row: i + 1, status: changed ? 'changed' : 'unchanged', cells: cells });
        }
        if (diffs.length >= maxRows) break;
      }
      if (applied.rows.length < original.rows.length) {
        applied.warnings = applied.warnings.concat([]);
      }
    }
    var affectedRows = diffs.filter(function (d) { return d.status !== 'unchanged'; }).length;
    return {
      ok: applied.warnings.filter(function (w) { return /retains 0 cases/.test(w); }).length === 0 || applied.nRows > 0,
      emptyResult: applied.nRows === 0,
      headers: applied.headers,
      originalHeaders: headers,
      rowsPreviewed: diffs.length,
      affectedRows: affectedRows,
      totalRows: applied.nRows,
      totalVars: applied.nVars,
      newVariables: applied.newVariables,
      excludedCases: applied.excludedCount,
      structural: applied.structural,
      warnings: applied.warnings,
      steps: applied.steps,
      diffs: diffs,
      values: [applied.headers].concat(applied.rows)
    };
  }

  function countAffectedCells(headers, rows, variables, codes) {
    var idxs = (variables || []).map(function (v) { return headerIndex(headers, v); }).filter(function (i) { return i >= 0; });
    var n = 0;
    (rows || []).forEach(function (row) {
      idxs.forEach(function (i) { if (codesMatch(row[i], codes || [])) n++; });
    });
    return n;
  }

  function filterImpact(headers, rows, step) {
    var ds = makeDataset(headers, rows);
    var result = applyFilter(ds, step || { conditions: [], logic: 'and' });
    return result;
  }

  return {
    uniqueSheetName: uniqueSheetName,
    uniqueVariableName: uniqueName,
    isBlank: isBlank,
    isMissing: isMissing,
    asNumber: asNumber,
    headerIndex: headerIndex,
    profileVariable: profileVariable,
    scanQuality: scanQuality,
    issueToRecipeStep: issueToRecipeStep,
    validateFormula: validateFormula,
    validateStep: validateStep,
    applyStep: applyStep,
    applyRecipe: applyRecipe,
    previewRecipe: previewRecipe,
    describeStep: describeStep,
    countAffectedCells: countAffectedCells,
    filterImpact: filterImpact,
    detectHarmonizeGroups: function (headers, rows, variable) {
      var i = headerIndex(headers, variable);
      if (i < 0) return [];
      return detectHarmonizeGroups(profileVariable(headers, rows, i, {}));
    },
    AVAILABLE_OPERATIONS: [
      { id: 'defineMissing', category: 'variables', label: 'Define missing-value codes' },
      { id: 'dropVariables', category: 'variables', label: 'Drop selected variables' },
      { id: 'recode', category: 'variables', label: 'Recode values' },
      { id: 'compute', category: 'variables', label: 'Compute a new variable' },
      { id: 'reverseScore', category: 'variables', label: 'Reverse-score items' },
      { id: 'composite', category: 'variables', label: 'Create a composite score' },
      { id: 'harmonize', category: 'variables', label: 'Harmonize category labels' },
      { id: 'filter', category: 'cases', label: 'Filter / select cases' },
      { id: 'flagDuplicates', category: 'cases', label: 'Flag duplicate rows' },
      { id: 'wideToLong', category: 'structure', label: 'Wide-to-long conversion' }
    ]
  };
});

const Prep = require('./prepare-engine.js');

const HEADERS = ['ID', 'Q1', 'Q2', 'Q3', 'Sex', 'Income', 'Time1', 'Time2'];

function rows() {
  return [
    [1, 1, 2, 5, 'Male', 40000, 3, 4],
    [2, 99, 4, 5, 'male', 0, 2, 3],
    [3, 3, 4, '', 'Male ', 55000, 5, 6],
    [4, 2, 2, 1, 'Female', 99, 1, 1],
    [5, 5, 5, 5, 'Female', 72000, 4, 5],
    ['', '', '', '', '', '', '', ''],
    [1, 1, 2, 5, 'Male', 40000, 3, 4]
  ];
}

describe('Statistico Prepare Data engine', () => {
  test('uniqueSheetName proposes an alternative when Prepared_Data exists', () => {
    expect(Prep.uniqueSheetName([], 'Prepared_Data')).toBe('Prepared_Data');
    expect(Prep.uniqueSheetName(['Prepared_Data'], 'Prepared_Data')).toBe('Prepared_Data_2');
    expect(Prep.uniqueSheetName(['Prepared_Data', 'Prepared_Data_2'], 'Prepared_Data')).toBe('Prepared_Data_3');
  });

  test('scan reports empty rows, duplicates, missing, mixed types, and category variants', () => {
    const scan = Prep.scanQuality(HEADERS, rows(), { missingCodes: [99] });
    expect(scan.rowsScanned).toBe(7);
    expect(scan.variablesScanned).toBe(8);
    const kinds = scan.issues.map((i) => i.kind);
    expect(kinds).toContain('empty_rows');
    expect(kinds).toContain('duplicate_rows');
    expect(kinds).toContain('inconsistent_categories');
    expect(kinds).toContain('missing_codes');
    expect(scan.issues.find((i) => i.kind === 'inconsistent_categories').variants.length).toBeGreaterThanOrEqual(2);
  });

  test('blank trailing columns are reported as information', () => {
    const headers = ['A', 'B', ''];
    const data = [
      [1, 2, ''],
      [3, 4, '']
    ];
    const scan = Prep.scanQuality(headers, data);
    expect(scan.emptyColumns).toBeGreaterThanOrEqual(1);
    expect(scan.issues.some((i) => i.kind === 'empty_cols')).toBe(true);
  });

  test('define missing-value codes in the prepared output only', () => {
    const source = rows();
    const snapshot = JSON.parse(JSON.stringify(source));
    const out = Prep.applyRecipe(HEADERS, source, [{
      type: 'defineMissing',
      variables: ['Q1', 'Income'],
      codes: [99],
      enabled: true
    }]);
    expect(source).toEqual(snapshot);
    expect(out.rows[1][1]).toBe(null);
    expect(out.rows[3][5]).toBe(null);
    expect(out.rows[0][1]).toBe(1);
    expect(out.steps[0].casesAffected).toBe(2);
  });

  test('recode unmatched values follow the otherwise rule', () => {
    const keep = Prep.applyRecipe(['G'], [['A'], ['B'], ['C']], [{
      type: 'recode',
      source: 'G',
      outputName: 'G2',
      mapping: { A: 1, B: 2 },
      otherwise: 'keep',
      enabled: true
    }]);
    expect(keep.rows[2][1]).toBe('C');
    expect(keep.steps[0].unmatched).toBe(1);

    const miss = Prep.applyRecipe(['G'], [['A'], ['C']], [{
      type: 'recode',
      source: 'G',
      outputName: 'G2',
      mapping: { A: 1 },
      otherwise: 'missing',
      enabled: true
    }]);
    expect(miss.rows[1][1]).toBe(null);
  });

  test('invalid computed-variable formula is rejected', () => {
    const bad = Prep.validateFormula('mean(Q1', ['Q1']);
    expect(bad.ok).toBe(false);
    const unknown = Prep.validateFormula('Q99 + 1', ['Q1']);
    expect(unknown.ok).toBe(false);
    const ok = Prep.validateFormula('mean(Q1, Q2) + abs(Q3)', ['Q1', 'Q2', 'Q3']);
    expect(ok.ok).toBe(true);

    const applied = Prep.applyRecipe(['Q1'], [[1]], [{
      type: 'compute',
      outputName: 'X',
      formula: 'not a formula !!!',
      enabled: true
    }]);
    expect(applied.steps[0].status).toBe('error');
    expect(applied.headers).toEqual(['Q1']);
  });

  test('reverse scoring uses min + max − original', () => {
    const out = Prep.applyRecipe(['Q1', 'Q2'], [[1, 5], [2, 4]], [{
      type: 'reverseScore',
      variables: ['Q1', 'Q2'],
      min: 1,
      max: 5,
      pattern: '{name}_r',
      enabled: true
    }]);
    expect(out.rows[0][2]).toBe(5);
    expect(out.rows[0][3]).toBe(1);
    expect(out.rows[1][2]).toBe(4);
    expect(out.headers).toEqual(['Q1', 'Q2', 'Q1_r', 'Q2_r']);
  });

  test('composite mean respects minimum valid items', () => {
    const headers = ['Q1', 'Q2', 'Q3'];
    const data = [[5, '', 3], [4, 4, 4]];
    const out = Prep.applyRecipe(headers, data, [{
      type: 'composite',
      variables: ['Q1', 'Q2', 'Q3'],
      method: 'mean',
      minValid: 2,
      outputName: 'Engage',
      enabled: true
    }]);
    expect(out.rows[0][3]).toBe(4);
    expect(out.rows[1][3]).toBe(4);

    const strict = Prep.applyRecipe(headers, data, [{
      type: 'composite',
      variables: ['Q1', 'Q2', 'Q3'],
      method: 'mean',
      minValid: 3,
      outputName: 'Engage',
      enabled: true
    }]);
    expect(strict.rows[0][3]).toBe(null);
    expect(strict.rows[1][3]).toBe(4);
  });

  test('harmonize maps capitalization and spacing variants after approval', () => {
    const data = [['Male'], ['male'], ['Male '], ['Female']];
    const groups = Prep.detectHarmonizeGroups(['Sex'], data, 'Sex');
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const mapping = groups[0].mapping;
    const out = Prep.applyRecipe(['Sex'], data, [{
      type: 'harmonize',
      variables: ['Sex'],
      mapping: mapping,
      enabled: true
    }]);
    const sex = out.rows.map((r) => r[0]);
    expect(new Set(sex.filter((v) => String(v).toLowerCase().replace(/\s+/g, ' ').trim() === 'male')).size).toBe(1);
    expect(sex).toContain('Female');
  });

  test('filter retaining zero cases warns and yields an empty result', () => {
    const out = Prep.applyRecipe(['Y'], [[1], [2]], [{
      type: 'filter',
      logic: 'and',
      conditions: [{ variable: 'Y', op: 'gt', value: 9 }],
      enabled: true
    }]);
    expect(out.nRows).toBe(0);
    expect(out.steps[0].retained).toBe(0);
    expect(out.warnings.some((w) => /0 cases/.test(w))).toBe(true);
    const preview = Prep.previewRecipe(['Y'], [[1], [2]], [{
      type: 'filter',
      logic: 'and',
      conditions: [{ variable: 'Y', op: 'gt', value: 9 }],
      enabled: true
    }]);
    expect(preview.emptyResult).toBe(true);
  });

  test('flagDuplicates marks later copies without deleting rows', () => {
    const data = [[1, 'A'], [2, 'B'], [1, 'A']];
    const out = Prep.applyRecipe(['ID', 'G'], data, [{
      type: 'flagDuplicates',
      flagName: 'duplicate_flag',
      enabled: true
    }]);
    expect(out.nRows).toBe(3);
    expect(out.rows[0][2]).toBe(0);
    expect(out.rows[2][2]).toBe(1);
    expect(out.headers).toContain('duplicate_flag');
  });

  test('wide-to-long conversion preserves id and stacks occasions', () => {
    const headers = ['ID', 'T1', 'T2', 'Age'];
    const data = [[10, 3, 4, 22], [11, 5, 6, 30]];
    const out = Prep.applyRecipe(headers, data, [{
      type: 'wideToLong',
      idVar: 'ID',
      measureVars: ['T1', 'T2'],
      timeName: 'Occasion',
      valueName: 'Score',
      enabled: true
    }]);
    expect(out.nRows).toBe(4);
    expect(out.headers).toEqual(['ID', 'Age', 'Occasion', 'Score']);
    expect(out.rows[0]).toEqual([10, 22, 'T1', 3]);
    expect(out.rows[1]).toEqual([10, 22, 'T2', 4]);
  });

  test('disabled and deleted recipe steps are skipped; later steps recalculate', () => {
    const headers = ['Q1', 'Q2'];
    const data = [[1, 2], [3, 4]];
    const steps = [
      { type: 'compute', outputName: 'S', formula: 'Q1 + Q2', enabled: true },
      { type: 'filter', logic: 'and', conditions: [{ variable: 'S', op: 'gt', value: 3 }], enabled: true }
    ];
    const full = Prep.applyRecipe(headers, data, steps);
    expect(full.nRows).toBe(1);

    const disabled = Prep.applyRecipe(headers, data, [
      Object.assign({}, steps[0], { enabled: false }),
      steps[1]
    ]);
    expect(disabled.steps[0].status).toBe('disabled');
    expect(disabled.steps[1].status).toBe('error');

    const deletedFirst = Prep.applyRecipe(headers, data, [steps[1]]);
    expect(deletedFirst.steps[0].status).toBe('error');

    const onlyCompute = Prep.applyRecipe(headers, data, [steps[0]]);
    expect(onlyCompute.nRows).toBe(2);
    expect(onlyCompute.rows[0][2]).toBe(3);
  });

  test('compute supports mean, if, and arithmetic', () => {
    const out = Prep.applyRecipe(['Q1', 'Q2'], [[2, 4], [10, 0]], [{
      type: 'compute',
      outputName: 'M',
      formula: 'if(Q2 = 0, Q1, mean(Q1, Q2))',
      enabled: true
    }]);
    expect(out.rows[0][2]).toBe(3);
    expect(out.rows[1][2]).toBe(10);
  });
});

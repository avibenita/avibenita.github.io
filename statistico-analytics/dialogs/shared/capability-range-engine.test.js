/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const Engine = require('./capability-range-engine.js');
const BG = require('./by-group-standard.js');

describe('capability from a range', () => {
  test('uses the calculator formulas and the sample standard deviation', () => {
    const local = fs.readFileSync(path.join(__dirname, 'cpk-math.js'), 'utf8');
    const source = fs.readFileSync(path.join(__dirname, '../../../specialized-tools/calculators/process-capability/cpk-math.js'), 'utf8');
    expect(local).toBe(source);

    const summary = Engine.summarize([1, 2, 3]);
    expect(summary.n).toBe(3);
    expect(summary.mean).toBe(2);
    expect(summary.sd).toBe(1);

    const result = Engine.analyzeValues([1, 2, 3], { lsl: 0, usl: 4 });
    expect(result.ok).toBe(true);
    expect(result.cp).toBeCloseTo(4 / 6, 10);
    expect(result.cpk).toBeCloseTo(2 / 3, 10);
    expect(result.sdKind).toBe('sample');
    expect(result.n).toBe(3);
  });

  test('rejects a constant measurement and reversed limits', () => {
    expect(Engine.analyzeValues([5, 5, 5], { lsl: 0, usl: 10 }).ok).toBe(false);
    expect(Engine.analyzeValues([1, 2, 3], { lsl: 8, usl: 4 }).ok).toBe(false);
    expect(Engine.analyzeValues([4], { lsl: 0, usl: 10 }).error).toMatch(/two numeric/);
  });

  test('compares capability by group and keeps the by-group contract', () => {
    expect(BG.moduleSentence('capability')).toBe('Compare Cp, Cpk, and the limiting specification across groups.');
    const demo = Engine.demoTable();
    const spec = Engine.demoSpec();
    const byLine = Engine.analyze(demo, Object.assign({ value: 'Diameter', group: 'Line' }, spec));
    expect(byLine.ok).toBe(true);
    expect(byLine.overall.n).toBe(39);
    expect(byLine.byGroup.status.label).toBe('Direction changes');
    expect(byLine.byGroup.status.descriptive).toBe(true);
    expect(byLine.byGroup.groups.filter(function (group) { return group.small; }).map(function (group) { return group.name; })).toEqual(['Pilot']);
    const bindings = {};
    byLine.byGroup.groups.forEach(function (group) {
      if (!group.small && group.ok) bindings[group.name] = group.binding;
    });
    expect(bindings.A).toBe('center');
    expect(bindings.B).toBe('upper');
    expect(bindings.C).toBe('lower');

    const byOperator = Engine.analyze(demo, Object.assign({ value: 'Diameter', group: 'Operator' }, spec));
    expect(byOperator.byGroup.status.label).toBe('Consistent');
    expect(byOperator.byGroup.interpretation.differs).toBe('No single group stands out from the others.');
    expect(byOperator.byGroup.interpretation.next).toMatch(/formal comparison/);
  });

  test('stops when a grouping column has too many levels', () => {
    const headers = ['Group', 'Measure'];
    const rows = [];
    var i;
    for (i = 0; i < 16; i++) rows.push(['G' + i, 10 + (i % 3)]);
    for (i = 0; i < 16; i++) rows.push(['G' + i, 12 + (i % 3)]);
    const result = Engine.analyze(
      { headers: headers, rows: rows },
      { value: 'Measure', group: 'Group', lsl: 0, usl: 30 }
    );
    expect(result.ok).toBe(true);
    expect(result.byGroup.ok).toBe(false);
    expect(result.byGroup.error).toMatch(/15/);
  });
});

/** @jest-environment node */
const FX = require('./regression-effect-plot.js');

const regionInfo = [{
  name: 'Region',
  categories: ['East', 'North', 'South', 'West'],
  dummyNames: ['Region_North', 'Region_South', 'Region_West']
}];

const regionNames = ['age', 'Region_North', 'Region_South', 'Region_West'];

function regionTerms() {
  return FX.termCatalog(null, regionNames, regionInfo, ['age']);
}

describe('predictor-effect profiles', () => {
  test('keeps the dummy name instead of falling back to an X index', () => {
    const terms = regionTerms();
    const selected = FX.selectionFromTerm(terms[1]);
    expect(terms[1].name).toBe('Region_North');
    expect(terms[1].kind).toBe('dummy');
    expect(terms[1].level).toBe('North');
    expect(selected).toMatchObject({
      mode: 'factor',
      factor: 'Region',
      level: 'North',
      name: 'Region_North'
    });
  });

  test('holds a factor at a real level instead of the mean of its indicators', () => {
    const terms = regionTerms();
    const rows = [
      [20, 1, 0, 0],
      [40, 0, 1, 0]
    ];
    const means = FX.columnMeans(rows);
    expect(means[1]).toBeCloseTo(0.5);
    expect(means[2]).toBeCloseTo(0.5);

    const east = FX.designVector(true, terms, { age: 20 }, { Region: 'East' }, means);
    const north = FX.designVector(true, terms, { age: 20 }, { Region: 'North' }, means);
    expect(east).toEqual([1, 20, 0, 0, 0]);
    expect(north).toEqual([1, 20, 1, 0, 0]);
  });

  test('builds an interaction from the held level rather than the interaction-column mean', () => {
    const columns = [
      { key: 'age', name: 'age', kind: 'numeric' },
      { key: 'Region_North', name: 'Region_North', kind: 'dummy', factor: 'Region', level: 'North' },
      {
        key: 'age × Region_North',
        name: 'age × Region_North',
        kind: 'interaction',
        factors: [
          { kind: 'numeric', name: 'age' },
          { kind: 'dummy', factor: 'Region', level: 'North' }
        ]
      }
    ];
    const names = columns.map(col => col.name);
    const terms = FX.termCatalog(columns, names, regionInfo, ['age']);
    const means = [30, 0.25, 12];
    const east = FX.designVector(true, terms, { age: 40 }, { Region: 'East' }, means);
    const north = FX.designVector(true, terms, { age: 40 }, { Region: 'North' }, means);
    expect(east).toEqual([1, 40, 0, 0]);
    expect(north).toEqual([1, 40, 1, 40]);
  });

  test('predicts each region at the same age, with the reference identified', () => {
    const terms = regionTerms();
    const factors = FX.factorsFromTerms(terms, regionInfo);
    expect(factors[0].reference).toBe('East');
    expect(factors[0].levels).toEqual(['East', 'North', 'South', 'West']);

    const rows = [
      [20, 1, 0, 0],
      [40, 0, 0, 0],
      [30, 0, 1, 0],
      [30, 0, 0, 1]
    ];
    const means = FX.columnMeans(rows);
    const numericMeans = FX.numericValueMap(terms, means);
    const beta = [10, 0.5, 2.3604, 4.2852, 1.467];
    const predictions = FX.factorPredictions({
      includeIntercept: true,
      terms: terms,
      factors: factors,
      focalFactor: 'Region',
      numericMeans: numericMeans,
      columnMeans: means,
      beta: beta,
      xtxInv: null,
      mse: 1,
      tCrit: 1.96
    });
    const byLevel = Object.fromEntries(predictions.map(row => [row.level, row]));
    expect(byLevel.East.x.slice(1)).toEqual([numericMeans.age, 0, 0, 0]);
    expect(byLevel.North.x.slice(1)).toEqual([numericMeans.age, 1, 0, 0]);
    expect(byLevel.North.x[1]).toBe(byLevel.East.x[1]);
    expect(byLevel.South.x[3]).toBe(1);
    expect(byLevel.West.x[4]).toBe(1);
    expect(byLevel.North.difference).toBeCloseTo(2.3604);
    expect(byLevel.East.difference).toBeCloseTo(0);
    expect(byLevel.East.isReference).toBe(true);
    expect(FX.levelAxisLabel('East', 'East')).toBe('East (reference)');
    expect(FX.levelAxisLabel('North', 'East')).toBe('North');
  });

  test('names the factor chart and states the age that was held', () => {
    const copy = FX.chartCopy({
      mode: 'factor',
      focalName: 'Region',
      yName: 'tenure_months',
      heldNumerics: [{ name: 'age', value: 34.2 }],
      heldFactors: [],
      referenceLevel: 'East'
    });
    expect(copy.title).toBe('Predicted tenure_months by Region, adjusted for age.');
    expect(copy.subtitle).toBe('age held at its mean, 34.2. East is the reference level.');
    expect(copy.xAxisTitle).toBe('Region');
    expect(copy.subtitle.toLowerCase()).not.toContain('average');
  });

  test('does not describe a factor as held at its average', () => {
    const terms = regionTerms();
    const factors = FX.factorsFromTerms(terms, regionInfo);
    const held = FX.heldAdjustments(terms, factors, { age: 34.2 }, { mode: 'numeric', name: 'age' });
    const copy = FX.chartCopy({
      mode: 'numeric',
      focalName: 'age',
      yName: 'tenure_months',
      heldNumerics: held.heldNumerics,
      heldFactors: held.heldFactors
    });
    expect(held.heldFactors).toEqual([{ name: 'Region', level: 'East' }]);
    expect(copy.title).toBe('Adjusted effect of age');
    expect(copy.subtitle).toBe('(Region held at East, the reference)');
    expect(copy.subtitle.toLowerCase()).not.toContain('average');
  });
});

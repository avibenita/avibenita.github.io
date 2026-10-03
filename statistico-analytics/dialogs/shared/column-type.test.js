/** @jest-environment node */
const CT = require('./column-type.js');

describe('StatisticoColumnType.isNumericCell', () => {
  test('treats real numbers as numeric', () => {
    expect(CT.isNumericCell(12)).toBe(true);
    expect(CT.isNumericCell(0)).toBe(true);
    expect(CT.isNumericCell(-1.5)).toBe(true);
    expect(CT.isNumericCell(' 18 ')).toBe(true);
    expect(CT.isNumericCell('1.25')).toBe(true);
    expect(CT.isNumericCell('1,5')).toBe(true);
  });

  test('normalizes Unicode minus signs and whitespace', () => {
    expect(CT.isNumericCell('\u22120.437')).toBe(true);
    expect(CT.parseNumericCell('\u22120.437')).toBeCloseTo(-0.437, 10);
    expect(CT.isNumericCell('\u00A0\u22120.12\u00A0')).toBe(true);
    expect(CT.parseNumericCell('\u00A0\u22120.12\u00A0')).toBeCloseTo(-0.12, 10);
    expect(CT.parseNumericCell('\u20130.25')).toBeCloseTo(-0.25, 10);
  });

  test('does not treat age-band labels as numeric', () => {
    expect(CT.isNumericCell('35–49')).toBe(false);
    expect(CT.isNumericCell('35-49')).toBe(false);
    expect(CT.isNumericCell('18–34')).toBe(false);
    expect(CT.isNumericCell('65+')).toBe(false);
    expect(CT.isNumericCell('50-64')).toBe(false);
  });

  test('rejects blanks, text, and non-finite values', () => {
    expect(CT.isNumericCell('')).toBe(false);
    expect(CT.isNumericCell('   ')).toBe(false);
    expect(CT.isNumericCell(null)).toBe(false);
    expect(CT.isNumericCell('Male')).toBe(false);
    expect(CT.isNumericCell(NaN)).toBe(false);
    expect(CT.isNumericCell(Infinity)).toBe(false);
    expect(CT.isNumericCell(true)).toBe(false);
  });
});

describe('StatisticoColumnType.profileColumns', () => {
  test('counts binary outcomes and categorical levels', () => {
    var stats = CT.profileColumns(
      ['y', 'group'],
      [[0, 'a'], [1, 'b'], [0, 'a'], [null, 'a'], ['', 'b']]
    );
    expect(stats.y.numeric).toBe(3);
    expect(stats.y.missing).toBe(2);
    expect(stats.y.categoriesCapped).toBe(false);
    expect(stats.y.uniqueCount).toBe(2);
    expect(stats.y.categories).toEqual(expect.arrayContaining([
      { value: '0', freq: 2 },
      { value: '1', freq: 1 }
    ]));
    expect(stats.group.string).toBe(5);
    expect(stats.group.uniqueCount).toBe(2);
  });

  test('keeps age-band labels categorical', () => {
    var stats = CT.profileColumns(['band'], [['35–49'], ['65+'], ['35–49']]);
    expect(stats.band.numeric).toBe(0);
    expect(stats.band.string).toBe(3);
    expect(stats.band.uniqueCount).toBe(2);
  });

  test('stops storing levels once a column is past the cap', () => {
    var rows = [];
    for (var i = 0; i < 40; i++) rows.push(['id-' + i, i % 2]);
    var stats = CT.profileColumns(['id', 'y'], rows);
    expect(stats.id.categoriesCapped).toBe(true);
    expect(stats.id.categories).toEqual([]);
    expect(stats.id.uniqueCount).toBe(CT.CATEGORY_STORE_LIMIT + 1);
    expect(stats.id.string).toBe(40);
    expect(stats.y.categoriesCapped).toBe(false);
    expect(stats.y.uniqueCount).toBe(2);
  });
});

describe('StatisticoColumnType.logisticDialogPayload', () => {
  test('sends a column profile instead of every row', () => {
    var values = [['y', 'x']];
    for (var i = 0; i < 5000; i++) values.push([i % 2, 'row-' + i]);
    var payload = CT.logisticDialogPayload(values, 'Sheet1!A1:B5001', {
      analysisMode: 'logistic',
      savedModelSpec: null,
      restoreSavedModel: false
    });
    expect(payload.rows).toEqual([]);
    expect(payload.rowCount).toBe(5000);
    expect(payload.profiled).toBe(true);
    expect(payload.columnStats.y.uniqueCount).toBe(2);
    expect(payload.columnStats.y.categories).toEqual(expect.arrayContaining([
      { value: '0', freq: 2500 },
      { value: '1', freq: 2500 }
    ]));
    expect(payload.columnStats.x.categoriesCapped).toBe(true);
    expect(JSON.stringify(payload).length).toBeLessThan(20000);
  });
});

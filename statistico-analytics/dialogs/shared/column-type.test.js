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

/** @jest-environment node */
const Labels = require('./regression-pred-labels.js');

describe('Regression predicted-response labels', () => {
  test('pretty-prints unit suffixes', () => {
    expect(Labels.prettyPredictor('Experience_yr')).toBe('Experience (years)');
    expect(Labels.prettyPredictor('Training_hr')).toBe('Training (hours)');
  });

  test('treats a recode as linked to its source predictor', () => {
    expect(Labels.isLinkedToGrouping('Training_hr', 'Training_hr_recode')).toBe(true);
    expect(Labels.isLinkedToGrouping('Training_hr_recode', 'Training_hr_recode')).toBe(true);
    expect(Labels.isLinkedToGrouping('Age_recode', 'Training_hr_recode')).toBe(false);
    expect(Labels.isLinkedToGrouping('Experience_yr', 'Training_hr_recode')).toBe(false);
  });

  test('labels group levels as column="Level"', () => {
    expect(Labels.prettyGroupLabel('high', 'tcat')).toBe('tcat="High"');
    expect(Labels.prettyGroupLabel('low', 'tcat')).toBe('tcat="Low"');
    expect(Labels.groupLevelWithN('high', 'tcat', 61)).toBe('tcat="High" (n=61)');
  });
});

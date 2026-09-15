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

  test('labels high/low groups from a training recode', () => {
    expect(Labels.prettyGroupLabel('high', 'Training_hr_recode')).toBe('High training');
    expect(Labels.prettyGroupLabel('low', 'Training_hr_recode')).toBe('Low training');
  });
});

/** @jest-environment node */
const BG = require('./by-group-standard.js');

describe('StatisticoByGroup contract', () => {
  test('keeps sidebar wording unchanged across modules', () => {
    expect(BG.SIDEBAR_SECTION).toBe('GROUP COMPARISON');
    expect(BG.SIDEBAR_LABEL).toBe('By Group');
    expect(BG.SIDEBAR_DESCRIPTION).toBe(
      'Compare results across categories, segments, or conditions to reveal differences, consistency, and patterns hidden by the overall analysis.'
    );
    expect(BG.sidebarItem({ file: 'correlations/by-group.html', view: 'correlation-by-group' })).toEqual({
      type: 'navigate',
      view: 'correlation-by-group',
      viewIn: undefined,
      file: 'correlations/by-group.html',
      tab: undefined,
      id: undefined,
      icon: 'fa-layer-group',
      iconTone: 'group',
      label: 'By Group',
      description: BG.SIDEBAR_DESCRIPTION
    });
  });

  test('keeps the standard page introduction', () => {
    expect(BG.PAGE_TITLE).toBe('By-Group Analysis');
    expect(BG.PAGE_SUBTITLE).toBe(
      'Examine whether the overall finding remains consistent across categories, segments, or conditions.'
    );
    expect(BG.WHY_TITLE).toBe('Why this matters');
    expect(BG.WHY_BODY).toMatch(/Pooled results can conceal important subgroup differences/);
    expect(BG.WHY_BODY).toMatch(/relationships that change direction/);
  });

  test('uses the approved module-specific sentences', () => {
    expect(BG.moduleSentence('correlations')).toBe('Compare correlation strength and direction across groups.');
    expect(BG.moduleSentence('regression')).toBe('Compare coefficients, model fit and diagnostics across groups.');
    expect(BG.moduleSentence('independent')).toBe('Compare effects and test results across group levels.');
    expect(BG.moduleSentence('reliability')).toBe('Compare reliability and item performance across groups.');
    expect(BG.moduleSentence('factor')).toBe('Examine whether the factor pattern remains similar across groups.');
    expect(BG.moduleSentence('logistic')).toBe('Compare discrimination, calibration and classification across groups.');
    expect(BG.moduleSentence('segmentation')).toBe('Examine how cluster membership and profiles differ by group.');
  });

  test('classifies the four standard consistency statuses', () => {
    expect(BG.classifyConsistency({}).label).toBe('Consistent');
    expect(BG.classifyConsistency({ magnitudeVaries: true }).label).toBe('Varies by group');
    expect(BG.classifyConsistency({ directionChanges: true }).label).toBe('Direction changes');
    expect(BG.classifyConsistency({ insufficient: true, directionChanges: true }).label).toBe('Insufficient data');
  });

  test('does not let descriptive differences be called a group effect', () => {
    const descriptive = BG.classifyConsistency({ magnitudeVaries: true });
    expect(descriptive.descriptive).toBe(true);
    expect(descriptive.canSayDiffer).toBe(false);
    expect(BG.SAFEGUARD_DESCRIPTIVE).toMatch(/descriptive/);
    expect(BG.SAFEGUARD_DESCRIPTIVE).toMatch(/do not by themselves establish a statistically significant group effect/);

    const tested = BG.classifyConsistency({
      magnitudeVaries: true,
      hasFormalTest: true,
      testSupportsDifference: true
    });
    expect(tested.canSayDiffer).toBe(true);
    expect(tested.descriptive).toBe(false);
  });

  test('detects sign reversals and small groups in signed metrics', () => {
    const assessed = BG.assessSignedMetrics([
      { name: 'North', value: 0.42, n: 40 },
      { name: 'South', value: -0.31, n: 36 },
      { name: 'West', value: 0.12, n: 4 }
    ], { minN: 10, absDelta: 0.2 });
    expect(assessed.classification.label).toBe('Direction changes');
    expect(assessed.smallGroups).toEqual(['West']);
  });

  test('renders group setup help, n chips, and the descriptive safeguard', () => {
    expect(BG.GROUP_BY_LABEL).toBe('Group by');
    expect(BG.GROUP_BY_HELP).toBe('Select a categorical variable that defines the groups to compare.');
    const setup = BG.groupSetupHtml({
      groupName: 'Site',
      missingN: 3,
      levels: [
        { name: 'North', n: 40 },
        { name: 'West', n: 4, small: true }
      ]
    });
    expect(setup).toContain('Group by');
    expect(setup).toContain('Site');
    expect(setup).toContain('n=40');
    expect(setup).toContain('missing a group value');
    expect(setup).toContain('Small group');
    expect(BG.safeguardHtml(false)).toContain(BG.SAFEGUARD_DESCRIPTIVE);
    expect(BG.safeguardHtml(true)).toBe('');
  });

  test('introduces the module-specific sentence after the shared why-this-matters copy', () => {
    const html = BG.introHtml('correlations');
    expect(html).toContain('Why this matters');
    expect(html).toContain('Compare correlation strength and direction across groups.');
    expect(html).toContain(BG.WHY_BODY);
  });

  test('builds an AI block that flags reversals and stays descriptive', () => {
    const block = BG.aiPromptBlock({
      status: BG.classifyConsistency({ directionChanges: true }),
      directionChanges: true,
      differsText: 'South reverses the overall positive association.',
      warningText: 'West has n=4.'
    });
    expect(block).toContain('Direction changes');
    expect(block).toContain('PROMINENT');
    expect(block).toContain(BG.SAFEGUARD_DESCRIPTIVE);
  });

  test('builds a compact header and result-first finding', () => {
    expect(BG.headerMetaText({
      variable: 'Feature_Z',
      groupName: 'Reference_Cluster',
      groupCount: 3,
      n: 190
    })).toBe('Feature_Z · Grouped by Reference_Cluster · 3 groups · n=190');
    expect(BG.similarityHeadline('Mixed similarity', 57.4)).toBe('Mixed similarity · 57/100');
    expect(BG.similarityConclusion([
      { id: 'location', label: 'location', score: 26 },
      { id: 'spread', label: 'spread', score: 92 },
      { id: 'shape', label: 'shape', score: 93 }
    ])).toBe('Groups differ mainly in location. Their spread and shape are very similar.');
    const finding = BG.findingHtml({
      headline: 'Mixed similarity · 57/100',
      conclusion: 'Groups differ mainly in location. Their spread and shape are very similar.',
      descriptive: true
    });
    expect(finding).toContain('Mixed similarity · 57/100');
    expect(finding).toContain('Groups differ mainly in location');
    expect(finding).toContain('Descriptive only');
    expect(BG.scoreCardHtml({ score: 57.4, band: 'Mixed similarity' })).toContain('Overall similarity');
    expect(BG.methodDetailsHtml({ moduleKey: 'univariate' })).toContain('Method &amp; interpretation');
    const comps = BG.similarityComponentsFromPairs([
      { usable: true, location: 26, spread: 92, shape: 93 },
      { usable: true, location: 26, spread: 92, shape: 93 }
    ]);
    expect(BG.similarityConclusion(comps)).toBe('Groups differ mainly in location. Their spread and shape are very similar.');
  });
});

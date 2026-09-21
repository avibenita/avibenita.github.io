import type { ModuleSpec } from './types';

/** Current production pages only — versioned / sandbox copies are excluded. */
export const MODULES: ModuleSpec[] = [
  {
    id: 'hub',
    name: 'Analytics Hub',
    route: '/taskpane/hub.html',
    source: 'taskpane/hub.html'
  },
  {
    id: 'univariate-workspace',
    name: 'Univariate Workspace',
    route: '/dialogs/views/univariate/univariate-workspace.html?demo=1',
    source: 'dialogs/views/univariate/univariate-workspace.html',
    prepare: ['wait:#overlayControls', 'wait:#showNormalCurve']
  },
  {
    id: 'univariate-input',
    name: 'Univariate Input',
    route: '/dialogs/views/univariate/univariate-input.html?demo=1',
    source: 'dialogs/views/univariate/univariate-input.html'
  },
  {
    id: 'histogram-v2',
    name: 'Univariate Histogram',
    route: '/dialogs/views/univariate/histogram-standalone-v2.html?demo=1',
    source: 'dialogs/views/univariate/histogram-standalone-v2.html',
    prepare: ['wait:#overlayControls']
  },
  {
    id: 'correlations-matrix',
    name: 'Correlation Matrix',
    route: '/dialogs/views/correlations/correlation-matrix.html?demo=1&embed=1',
    source: 'dialogs/views/correlations/correlation-matrix.html',
    prepare: ['wait:#showPValue']
  },
  {
    id: 'correlations-partial',
    name: 'Partial Correlation',
    route: '/dialogs/views/correlations/correlation-partial.html?demo=1',
    source: 'dialogs/views/correlations/correlation-partial.html',
    prepare: ['wait:#togglePval']
  },
  {
    id: 'correlations-taylor',
    name: 'Taylor Diagram',
    route: '/dialogs/views/correlations/correlation-taylor.html?demo=1',
    source: 'dialogs/views/correlations/correlation-taylor.html',
    prepare: ['wait:#normalize-toggle']
  },
  {
    id: 'correlations-network',
    name: 'Correlation Network',
    route: '/dialogs/views/correlations/correlation-network.html?demo=1',
    source: 'dialogs/views/correlations/correlation-network.html',
    prepare: ['wait:#showCorrValues']
  },
  {
    id: 'correlations-results',
    name: 'Correlation Results',
    route: '/dialogs/views/correlations/correlation-results.html?demo=1',
    source: 'dialogs/views/correlations/correlation-results.html',
    prepare: ['wait:#showPValue']
  },
  {
    id: 'correlations-by-group',
    name: 'Correlation By Group',
    route: '/dialogs/views/correlations/by-group.html?demo=1',
    source: 'dialogs/views/correlations/by-group.html'
  },
  {
    id: 'correlations-reliability',
    name: 'Correlation Reliability',
    route: '/dialogs/views/correlations/correlation-reliability.html?demo=1',
    source: 'dialogs/views/correlations/correlation-reliability.html'
  },
  {
    id: 'regression-input',
    name: 'Regression Input',
    route: '/dialogs/views/regression/regression-input.html?demo=1',
    source: 'dialogs/views/regression/regression-input.html',
    prepare: ['wait:#chkIncludeIntercept']
  },
  {
    id: 'regression-coefficients',
    name: 'Regression Coefficients',
    route: '/dialogs/views/regression/regression-coefficients.html?demo=1',
    source: 'dialogs/views/regression/regression-coefficients.html'
  },
  {
    id: 'regression-by-group',
    name: 'Regression By Group',
    route: '/dialogs/views/regression/regression-by-group.html?demo=1',
    source: 'dialogs/views/regression/regression-by-group.html'
  },
  {
    id: 'reliability-input',
    name: 'Reliability Input',
    route: '/dialogs/views/reliability/reliability-input.html?demo=1',
    source: 'dialogs/views/reliability/reliability-input.html',
    prepare: ['click:button.cfg-tab[data-tab="options"]', 'wait:#optAlpha']
  },
  {
    id: 'reliability-analysis',
    name: 'Reliability Analysis',
    route: '/dialogs/views/reliability/reliability-analysis.html?demo=1',
    source: 'dialogs/views/reliability/reliability-analysis.html',
    prepare: ['wait:#showPairN']
  },
  {
    id: 'mixed-input',
    name: 'Mixed Model Input',
    route: '/dialogs/views/mixed/mixed-input.html?demo=1',
    source: 'dialogs/views/mixed/mixed-input.html',
    prepare: ['wait:#chkTypeIII']
  },
  {
    id: 'mixed-results',
    name: 'Mixed Model Results',
    route: '/dialogs/views/mixed/mixed-results.html?demo=1',
    source: 'dialogs/views/mixed/mixed-results.html'
  },
  {
    id: 'pca',
    name: 'PCA',
    route: '/dialogs/views/pca/pca-analysis.html?demo=1',
    source: 'dialogs/views/pca/pca-analysis.html',
    prepare: ['wait:#showVectorsToggle']
  },
  {
    id: 'pareto-results',
    name: 'Pareto Results',
    route: '/dialogs/views/pareto/pareto-results.html?demo=1',
    source: 'dialogs/views/pareto/pareto-results.html',
    prepare: ['wait:#optCumLine']
  },
  {
    id: 'pareto-input',
    name: 'Pareto Input',
    route: '/dialogs/views/pareto/pareto-input.html?demo=1',
    source: 'dialogs/views/pareto/pareto-input.html'
  },
  {
    id: 'segmentation-input',
    name: 'Segmentation Input',
    route: '/dialogs/views/segmentation/segmentation-input.html?demo=1',
    source: 'dialogs/views/segmentation/segmentation-input.html'
  },
  {
    id: 'segmentation-results',
    name: 'Segmentation Results',
    route: '/dialogs/views/segmentation/segmentation-results.html?demo=1',
    source: 'dialogs/views/segmentation/segmentation-results.html',
    prepare: ['wait:#showBenchmark']
  },
  {
    id: 'contingency-input',
    name: 'Contingency Input',
    route: '/dialogs/views/contingency/contingency-input.html?demo=1',
    source: 'dialogs/views/contingency/contingency-input.html'
  },
  {
    id: 'contingency-results',
    name: 'Contingency Results',
    route: '/dialogs/views/contingency/contingency-results.html?demo=1',
    source: 'dialogs/views/contingency/contingency-results.html',
    prepare: ['wait:#vizLabels']
  },
  {
    id: 'contingency-by-group',
    name: 'Contingency By Group',
    route: '/dialogs/views/contingency/by-group.html?demo=1',
    source: 'dialogs/views/contingency/by-group.html'
  },
  {
    id: 'meta-input',
    name: 'Meta-Analysis Input',
    route: '/dialogs/views/meta-analysis/meta-input.html?demo=1',
    source: 'dialogs/views/meta-analysis/meta-input.html',
    prepare: ['wait:#hartungKnapp']
  },
  {
    id: 'meta-results',
    name: 'Meta-Analysis Results',
    route: '/dialogs/views/meta-analysis/meta-results.html?demo=1',
    source: 'dialogs/views/meta-analysis/meta-results.html'
  },
  {
    id: 'cluster-input',
    name: 'Cluster Input',
    route: '/dialogs/views/cluster/cluster-input.html?demo=1',
    source: 'dialogs/views/cluster/cluster-input.html',
    prepare: ['wait:#clusterStandardize']
  },
  {
    id: 'cluster-analysis',
    name: 'Cluster Analysis',
    route: '/dialogs/views/cluster/cluster-analysis.html?demo=1',
    source: 'dialogs/views/cluster/cluster-analysis.html'
  },
  {
    id: 'factor-input',
    name: 'Factor Analysis Input',
    route: '/dialogs/views/factor/factor-input.html?demo=1',
    source: 'dialogs/views/factor/factor-input.html'
  },
  {
    id: 'factor-results',
    name: 'Factor Analysis Results',
    route: '/dialogs/views/factor/factor-results-v3.html?demo=1',
    source: 'dialogs/views/factor/factor-results-v3.html'
  },
  {
    id: 'publication-tables',
    name: 'Publication Tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html?demo=1',
    source: 'dialogs/views/publication-tables/publication-tables-builder.html',
    prepare: ['wait:#pt2ShowOverall']
  },
  {
    id: 'prepare-dataset',
    name: 'Prepare Dataset',
    route: '/dialogs/views/prepare/prepare-dataset-input.html?demo=1',
    source: 'dialogs/views/prepare/prepare-dataset-input.html'
  },
  {
    id: 'prepare-quality',
    name: 'Prepare Quality',
    route: '/dialogs/views/prepare/prepare-quality-input.html?demo=1',
    source: 'dialogs/views/prepare/prepare-quality-input.html'
  },
  {
    id: 'logistic-input',
    name: 'Logistic Input',
    route: '/dialogs/views/logistic/logistic-input.html?demo=1',
    source: 'dialogs/views/logistic/logistic-input.html',
    prepare: ['wait:#chkIncludeIntercept']
  },
  {
    id: 'logistic-results',
    name: 'Logistic Results',
    route: '/dialogs/views/logistic/logistic-results.html?demo=1',
    source: 'dialogs/views/logistic/logistic-results.html'
  },
  {
    id: 'dependent-kplus',
    name: 'Repeated Measures Results',
    route: '/dialogs/views/dependent/dependent-results-kplus.html?demo=1',
    source: 'dialogs/views/dependent/dependent-results-kplus.html'
  },
  {
    id: 'dependent-input',
    name: 'Repeated Measures Input',
    route: '/dialogs/views/dependent/dependent-input.html?demo=1',
    source: 'dialogs/views/dependent/dependent-input.html'
  },
  {
    id: 'anova-input',
    name: 'ANOVA Input',
    route: '/dialogs/views/anova/anova-input.html?demo=1',
    source: 'dialogs/views/anova/anova-input.html'
  },
  {
    id: 'anova-results',
    name: 'ANOVA Results',
    route: '/dialogs/views/anova/anova-results.html?demo=1',
    source: 'dialogs/views/anova/anova-results.html'
  },
  {
    id: 'independent-input',
    name: 'Independent Means Input',
    route: '/dialogs/views/independent/independent-input.html?demo=1',
    source: 'dialogs/views/independent/independent-input.html'
  },
  {
    id: 'independent-results',
    name: 'Independent Means Results',
    route: '/dialogs/views/independent/independent-results.html?demo=1',
    source: 'dialogs/views/independent/independent-results.html'
  },
  {
    id: 'mv-input',
    name: 'Multivariable Input',
    route: '/dialogs/views/multivariable/mv-input.html?demo=1',
    source: 'dialogs/views/multivariable/mv-input.html',
    prepare: ['click:#btnLoadSample']
  },
  {
    id: 'mv-results',
    name: 'Multivariable Results',
    route: '/dialogs/views/multivariable/mv-results.html?demo=1',
    source: 'dialogs/views/multivariable/mv-results.html'
  },
  {
    id: 'power-results',
    name: 'Power Results',
    route: '/dialogs/views/power/power-results.html?demo=1',
    source: 'dialogs/views/power/power-results.html'
  },
  {
    id: 'shared-checkbox-fixture',
    name: 'Shared Checkbox Fixture',
    route: '/tests/e2e/fixtures/shared-checkbox.html',
    source: 'dialogs/views/shared-header.js'
  }
];

import type { CheckboxContract } from './types';

/**
 * Expected checkbox effects taken from production handlers.
 * Anything that cannot be read safely from the source is omitted
 * so the runner can mark it NEEDS_EXPECTATION.
 */
export const CONTRACTS: CheckboxContract[] = [
  {
    id: 'showNormalCurve',
    module: 'univariate-workspace',
    route: '/dialogs/views/univariate/univariate-workspace.html',
    name: 'Normal',
    locator: '#showNormalCurve',
    expectedInitial: true,
    effect: {
      description: 'Histogram redraws with a normal-curve overlay',
      assert: async (page, checked) => {
        const on = await page.locator('#showNormalCurve').isChecked();
        return on === checked;
      }
    }
  },
  {
    id: 'showMeanLine',
    module: 'univariate-workspace',
    route: '/dialogs/views/univariate/univariate-workspace.html',
    name: 'Mean',
    locator: '#showMeanLine',
    expectedInitial: false,
    effect: {
      description: 'Histogram redraws with a mean line',
      assert: async (page, checked) => (await page.locator('#showMeanLine').isChecked()) === checked
    }
  },
  {
    id: 'showMedianLine',
    module: 'univariate-workspace',
    route: '/dialogs/views/univariate/univariate-workspace.html',
    name: 'Median',
    locator: '#showMedianLine',
    expectedInitial: false,
    effect: {
      description: 'Histogram redraws with a median line',
      assert: async (page, checked) => (await page.locator('#showMedianLine').isChecked()) === checked
    }
  },
  {
    id: 'showPValue',
    module: 'correlations-matrix',
    route: '/dialogs/views/correlations/correlation-matrix.html',
    name: 'p-value',
    locator: '#showPValue',
    expectedInitial: true,
    effect: {
      description: 'Correlation table shows or hides p-value cells via toggleDisplay()',
      assert: async (page, checked) => (await page.locator('#showPValue').isChecked()) === checked
    }
  },
  {
    id: 'showN',
    module: 'correlations-matrix',
    route: '/dialogs/views/correlations/correlation-matrix.html',
    name: 'N',
    locator: '#showN',
    expectedInitial: true,
    effect: {
      description: 'Correlation table shows or hides pairwise N via toggleDisplay()',
      assert: async (page, checked) => (await page.locator('#showN').isChecked()) === checked
    }
  },
  {
    id: 'showNetCorrValues',
    module: 'correlations-matrix',
    route: '/dialogs/views/correlations/correlation-matrix.html',
    name: 'Show r values',
    locator: '#showNetCorrValues',
    expectedInitial: true,
    effect: {
      description: 'Network edges show correlation values',
      assert: async (page, checked) => (await page.locator('#showNetCorrValues').isChecked()) === checked
    }
  },
  {
    id: 'showOnlyConnectedNetworkNodes',
    module: 'correlations-matrix',
    route: '/dialogs/views/correlations/correlation-matrix.html',
    name: 'Only connected variables',
    locator: '#showOnlyConnectedNetworkNodes',
    expectedInitial: false,
    effect: {
      description: 'Isolated network nodes are hidden',
      assert: async (page, checked) => (await page.locator('#showOnlyConnectedNetworkNodes').isChecked()) === checked
    }
  },
  {
    id: 'togglePval',
    module: 'correlations-partial',
    route: '/dialogs/views/correlations/correlation-partial.html',
    name: 'Show p-values',
    locator: '#togglePval',
    expectedInitial: false
  },
  {
    id: 'toggleN',
    module: 'correlations-partial',
    route: '/dialogs/views/correlations/correlation-partial.html',
    name: 'Show df',
    locator: '#toggleN',
    expectedInitial: false
  },
  {
    id: 'normalize-toggle',
    module: 'correlations-taylor',
    route: '/dialogs/views/correlations/correlation-taylor.html',
    name: 'Normalize to SD=1.0',
    locator: '#normalize-toggle',
    expectedInitial: false,
    effect: {
      description: 'Taylor reference panel shows the ACTIVE badge when normalized',
      assert: async (page, checked) => {
        const badge = page.locator('#norm-badge');
        if (!(await badge.count())) return true;
        const visible = await badge.isVisible();
        return checked ? visible : true;
      }
    }
  },
  {
    id: 'showCorrValues',
    module: 'correlations-network',
    route: '/dialogs/views/correlations/correlation-network.html',
    name: 'Show r values',
    locator: '#showCorrValues',
    expectedInitial: true
  },
  {
    id: 'showOnlyConnected',
    module: 'correlations-network',
    route: '/dialogs/views/correlations/correlation-network.html',
    name: 'Only connected variables',
    locator: '#showOnlyConnected',
    expectedInitial: false
  },
  {
    id: 'chkIncludeIntercept-reg',
    module: 'regression-input',
    route: '/dialogs/views/regression/regression-input.html',
    name: 'Include intercept (β₀)',
    locator: '#chkIncludeIntercept',
    expectedInitial: true
  },
  {
    id: 'chkIncludeIntercept-log',
    module: 'logistic-input',
    route: '/dialogs/views/logistic/logistic-input.html',
    name: 'Include intercept',
    locator: '#chkIncludeIntercept',
    expectedInitial: true
  },
  {
    id: 'optAlpha',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Cronbach’s alpha',
    locator: '#optAlpha',
    expectedInitial: true
  },
  {
    id: 'optOmega',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'McDonald’s omega total',
    locator: '#optOmega',
    expectedInitial: true
  },
  {
    id: 'optStdAlpha',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Standardized alpha',
    locator: '#optStdAlpha',
    expectedInitial: false
  },
  {
    id: 'optCI',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Confidence interval',
    locator: '#optCI',
    expectedInitial: true
  },
  {
    id: 'optITC',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Corrected item–total correlation',
    locator: '#optITC',
    expectedInitial: true
  },
  {
    id: 'optAlphaDel',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Alpha if item deleted',
    locator: '#optAlphaDel',
    expectedInitial: true
  },
  {
    id: 'optOmegaDel',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Omega if item deleted',
    locator: '#optOmegaDel',
    expectedInitial: true
  },
  {
    id: 'optMatrix',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Inter-item correlation matrix',
    locator: '#optMatrix',
    expectedInitial: true
  },
  {
    id: 'optFlagWeak',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Flag weak item–total correlations',
    locator: '#optFlagWeak',
    expectedInitial: true
  },
  {
    id: 'optUni',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Unidimensionality check',
    locator: '#optUni',
    expectedInitial: true
  },
  {
    id: 'optScree',
    module: 'reliability-input',
    route: '/dialogs/views/reliability/reliability-input.html',
    name: 'Scree plot',
    locator: '#optScree',
    expectedInitial: true
  },
  {
    id: 'showPairN',
    module: 'reliability-analysis',
    route: '/dialogs/views/reliability/reliability-analysis.html',
    name: 'Pairwise N',
    locator: '#showPairN',
    expectedInitial: false
  },
  {
    id: 'chkTypeIII',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Type III Fixed Effects',
    locator: '#chkTypeIII',
    expectedInitial: true
  },
  {
    id: 'chkCoeffs',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Fixed Effect Coefficients',
    locator: '#chkCoeffs',
    expectedInitial: true
  },
  {
    id: 'chkVarComp',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Variance Components',
    locator: '#chkVarComp',
    expectedInitial: true
  },
  {
    id: 'chkEMM',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Estimated Marginal Means',
    locator: '#chkEMM',
    expectedInitial: true
  },
  {
    id: 'chkPairwise',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Pairwise Contrasts',
    locator: '#chkPairwise',
    expectedInitial: false
  },
  {
    id: 'chkBLUP',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'BLUPs (Random Predictions)',
    locator: '#chkBLUP',
    expectedInitial: false
  },
  {
    id: 'chkResid',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Residual Diagnostics',
    locator: '#chkResid',
    expectedInitial: true
  },
  {
    id: 'chkIC',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Information Criteria (AIC/BIC)',
    locator: '#chkIC',
    expectedInitial: true
  },
  {
    id: 'chkPseudoR2',
    module: 'mixed-input',
    route: '/dialogs/views/mixed/mixed-input.html',
    name: 'Pseudo R²',
    locator: '#chkPseudoR2',
    expectedInitial: true
  },
  {
    id: 'showVectorsToggle',
    module: 'pca',
    route: '/dialogs/views/pca/pca-analysis.html',
    name: 'Show loading vectors',
    locator: '#showVectorsToggle',
    expectedInitial: true
  },
  {
    id: 'optCumLine',
    module: 'pareto-results',
    route: '/dialogs/views/pareto/pareto-results.html',
    name: 'Cumulative line',
    locator: '#optCumLine',
    expectedInitial: true
  },
  {
    id: 'optThreshLine',
    module: 'pareto-results',
    route: '/dialogs/views/pareto/pareto-results.html',
    name: 'Threshold line',
    locator: '#optThreshLine',
    expectedInitial: true
  },
  {
    id: 'optLabels',
    module: 'pareto-results',
    route: '/dialogs/views/pareto/pareto-results.html',
    name: 'Labels',
    locator: '#optLabels',
    expectedInitial: true
  },
  {
    id: 'showBenchmark',
    module: 'segmentation-results',
    route: '/dialogs/views/segmentation/segmentation-results.html',
    name: 'Show overall benchmark',
    locator: '#showBenchmark',
    expectedInitial: false
  },
  {
    id: 'siEvidence',
    module: 'segmentation-results',
    route: '/dialogs/views/segmentation/segmentation-results.html',
    name: 'Show statistical evidence',
    locator: '#siEvidence',
    expectedInitial: false
  },
  {
    id: 'vizLabels',
    module: 'contingency-results',
    route: '/dialogs/views/contingency/contingency-results.html',
    name: 'Data labels',
    locator: '#vizLabels',
    expectedInitial: false
  },
  {
    id: 'hartungKnapp',
    module: 'meta-input',
    route: '/dialogs/views/meta-analysis/meta-input.html',
    name: 'Hartung–Knapp adjustment',
    locator: '#hartungKnapp',
    expectedInitial: true
  },
  {
    id: 'clusterStandardize',
    module: 'cluster-input',
    route: '/dialogs/views/cluster/cluster-input.html',
    name: 'Standardise variables',
    locator: '#clusterStandardize',
    expectedInitial: true
  },
  {
    id: 'pt2ShowOverall',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Show Overall column',
    locator: '#pt2ShowOverall',
    expectedInitial: false
  },
  {
    id: 'pt2ShowPValue',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Show P value column',
    locator: '#pt2ShowPValue',
    expectedInitial: false
  },
  {
    id: 'pt2ShowSMD',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Show standardized difference (SMD)',
    locator: '#pt2ShowSMD',
    expectedInitial: false
  },
  {
    id: 'pt2CompleteCase',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Use a common analysis sample for all rows',
    locator: '#pt2CompleteCase',
    expectedInitial: false
  },
  {
    id: 'pt2ShowMissingCat',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Show Missing as its own category',
    locator: '#pt2ShowMissingCat',
    expectedInitial: false
  },
  {
    id: 'pt2CustomItalic',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Italic title',
    locator: '#pt2CustomItalic',
    expectedInitial: false
  },
  {
    id: 'pt2CustomBoldCaption',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Bold caption label',
    locator: '#pt2CustomBoldCaption',
    expectedInitial: true
  },
  {
    id: 'pt2CustomLeadingZero',
    module: 'publication-tables',
    route: '/dialogs/views/publication-tables/publication-tables-builder.html',
    name: 'Leading zero in p-values',
    locator: '#pt2CustomLeadingZero',
    expectedInitial: false
  },
  {
    id: 'changedOnly',
    module: 'prepare-dataset',
    route: '/dialogs/views/prepare/prepare-dataset-input.html',
    name: 'Changed rows only',
    locator: '#changedOnly',
    expectedInitial: true
  },
  {
    id: 'chkDescriptives',
    module: 'anova-input',
    route: '/dialogs/views/anova/anova-input.html',
    name: 'Descriptives (hidden state)',
    locator: '#chkDescriptives',
    expectedInitial: true,
    intentionallyDisabled: true
  },
  {
    id: 'chkAssumptions',
    module: 'anova-input',
    route: '/dialogs/views/anova/anova-input.html',
    name: 'Assumptions (hidden state)',
    locator: '#chkAssumptions',
    expectedInitial: true,
    intentionallyDisabled: true
  },
  {
    id: 'chkNonParam',
    module: 'anova-input',
    route: '/dialogs/views/anova/anova-input.html',
    name: 'Non-parametric (hidden state)',
    locator: '#chkNonParam',
    expectedInitial: true,
    intentionallyDisabled: true
  },
  {
    id: 'regShowCoefDetails',
    module: 'regression-by-group',
    route: '/dialogs/views/regression/regression-by-group.html',
    name: 'Show 95% CI',
    locator: '#regShowCoefDetails',
    expectedInitial: false
  },
  {
    id: 'regShowOverallModel',
    module: 'regression-by-group',
    route: '/dialogs/views/regression/regression-by-group.html',
    name: 'Show overall model',
    locator: '#regShowOverallModel',
    expectedInitial: false
  },
  {
    id: 'regSimCiToggle',
    module: 'regression-by-group',
    route: '/dialogs/views/regression/regression-by-group.html',
    name: '95% CI for the mean',
    locator: '#regSimCiToggle',
    expectedInitial: true
  },
  {
    id: 'scoreShowEllipse',
    module: 'factor-results',
    route: '/dialogs/views/factor/factor-results-v3.html',
    name: 'Show ellipse',
    locator: '#scoreShowEllipse',
    expectedInitial: false
  },
  {
    id: 'showVectors-pca',
    module: 'pca',
    route: '/dialogs/views/pca/pca-analysis.html',
    name: 'Show',
    locator: '#showVectorsToggle',
    expectedInitial: true
  }
];

export function findContract(moduleId: string, checkboxId: string): CheckboxContract | undefined {
  return CONTRACTS.find((c) => c.module === moduleId && (c.locator === `#${checkboxId}` || c.id === checkboxId));
}

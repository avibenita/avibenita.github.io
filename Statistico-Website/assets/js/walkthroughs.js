/**
 * Reusable walkthrough catalog.
 * Chapter ids stay stable when a title or timestamp changes.
 * expectedDuration is the verified asset length in seconds. The player hides
 * chapter navigation when the loaded file does not match.
 */
(function (root) {
  'use strict';

  root.StatisticoWalkthroughs = {
    univariate: {
      id: 'univariate',
      kicker: 'Univariate analysis',
      title: 'Discover how much one variable can reveal.',
      lead: 'A guided tour of interactive distributions, diagnostics, uncertainty, and group comparisons.',
      durationLabel: '7:46',
      expectedDuration: 466.2,
      durationTolerance: 0.5,
      src: '/Statistico-Website/media/demos/univariate/univariate__premium-transitions__r1940.mp4?v=20261125r1940',
      poster: '/Statistico-Website/media/demos/univariate/univariate-walkthrough-preview.jpg?v=20261126preview',
      chapters: [
        { id: 'setup', start: 18.63, title: 'Set up the analysis' },
        { id: 'distribution', start: 56.63, title: 'Distribution' },
        { id: 'outlier-impact', start: 100.73, title: 'Outliers and their impact' },
        { id: 'kernel-density', start: 149.63, title: 'Kernel density' },
        { id: 'normality', start: 170.93, title: 'Normality' },
        { id: 'confidence-intervals', start: 211.33, title: 'Confidence intervals' },
        { id: 'one-sample-test', start: 285.53, title: 'One-sample test and power analysis' },
        { id: 'by-group', start: 339.83, title: 'By Group Analysis' },
        { id: 'original-developments', start: 382.83, title: 'Original Statistico Developments' }
      ]
    },
    correlations: {
      id: 'correlations',
      kicker: 'Correlation analysis',
      title: 'See how relationships take shape.',
      lead: 'A guided tour of the correlation matrix, scatter detail, and how the view responds as you refine it.',
      durationLabel: '8:46',
      expectedDuration: 525.533,
      durationTolerance: 0.5,
      src: '/Statistico-Website/media/demos/correlations/correlation__walkthrough__narrated.mp4?v=20261126narrated2',
      chapters: [
        { id: 'setup', start: 20, title: 'Set up the analysis' },
        { id: 'matrix-and-pairs', start: 52, title: 'Correlation Matrix' },
        { id: 'interactive-scatter', start: 122, title: 'Interactive scatter plots' },
        { id: 'network', start: 177, title: 'Correlation network' },
        { id: 'partial-correlation', start: 213, title: 'Partial correlations' },
        { id: 'taylor-preview', start: 282, title: 'Taylor Diagram' },
        { id: 'group-comparison', start: 344, title: 'By Group Analysis' },
        { id: 'original-developments', start: 421, title: 'Original Statistico Development' }
      ]
    }
  };
})(window);

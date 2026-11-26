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
      src: '/Statistico-Website/media/demos/univariate/univariate__premium-transitions__r1940.mp4?v=20261125r1940',
      poster: '/Statistico-Website/media/demos/univariate/univariate-walkthrough-preview.jpg?v=20261126preview'
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
        { id: 'introduction', start: 0, title: 'Welcome and overview' },
        { id: 'demonstration-data', start: 20, title: 'Demonstration data' },
        { id: 'setup', start: 32, title: 'Set up the analysis' },
        { id: 'matrix-and-pairs', start: 52, title: 'Matrix, heatmap and ranked pairs' },
        { id: 'interactive-scatter', start: 122, title: 'Interactive scatterplot' },
        { id: 'highlight-results', start: 155, title: 'Highlight relationships' },
        { id: 'network', start: 177, title: 'Correlation network' },
        { id: 'partial-correlation', start: 213, title: 'Partial correlation' },
        { id: 'taylor-preview', start: 284.633, title: 'Taylor diagram — concept preview' },
        { id: 'descriptives', start: 322.633, title: 'Descriptives and normality' },
        { id: 'group-comparison', start: 343.633, title: 'Compare groups' },
        { id: 'group-similarity', start: 390.633, title: 'Group similarity profile' },
        { id: 'original-developments', start: 420.633, title: 'Original Statistico developments' },
        { id: 'beyond-correlations', start: 479.933, title: 'Saving, AI interpretation and export' }
      ]
    }
  };
})(window);

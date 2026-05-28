/**
 * ds-guide.js    Data Structure Guide panel
 * Renders a role-coloured mini-grid and one-line rule for each input module.
 * Usage: DsGuide.render('independent', 'dsGuideContainer');
 */
(function (global) {
  'use strict';

  var CONFIGS = {
    independent: {
      badge: 'Wide format  each column is a group',
      rule:  'Each column = one group. Rows are independent observations of the same outcome variable.',
      note:  'Unlike SPSS, groups are NOT stacked in one column  each group has its own column.',
      cols: [
        { label: 'Engineers', role: 'group', roleLabel: 'Group' },
        { label: 'Sales',     role: 'group', roleLabel: 'Group' },
        { label: 'Marketing', role: 'group', roleLabel: 'Group' },
        { label: 'Support',   role: 'group', roleLabel: 'Group' }
      ],
      rows: [
        ['5 200', '6 100', '5 800', '4 900'],
        ['5 800', '6 400', '5 950', '5 100'],
        ['6 100', '6 700', '6 200', '5 300']
      ]
    },

    'independent-two': {
      badge: 'Wide format  each column is a group',
      rule:  'Each column = one group. Rows are independent observations of the same outcome variable.',
      note:  'Unlike SPSS, groups are NOT stacked in one column  each group has its own column.',
      cols: [
        { label: 'Control', role: 'group', roleLabel: 'Group' },
        { label: 'Treatment', role: 'group', roleLabel: 'Group' }
      ],
      rows: [
        ['5 200', '6 100'],
        ['5 800', '6 400'],
        ['6 100', '6 700']
      ]
    },

    dependent: {
      badge: 'Wide format  each column is a timepoint',
      rule:  'Each row = the same subject measured twice. Each column = one timepoint.',
      note:  'Unlike SPSS, timepoints are NOT stacked in one column  each timepoint has its own column.',
      cols: [
        { label: 'Before', role: 'meas', roleLabel: 'Timepoint' },
        { label: 'After',  role: 'meas', roleLabel: 'Timepoint' }
      ],
      rows: [
        ['120', '110'],
        ['135', '128'],
        ['140', '130']
      ]
    },

    'dependent-kplus': {
      badge: 'Wide format  each column is a timepoint',
      rule:  'Each row = the same subject. Each column = one timepoint or condition.',
      note:  'Unlike SPSS, timepoints are NOT stacked in one column  each timepoint has its own column.',
      cols: [
        { label: 'Time 1', role: 'meas', roleLabel: 'Timepoint' },
        { label: 'Time 2', role: 'meas', roleLabel: 'Timepoint' },
        { label: 'Time 3', role: 'meas', roleLabel: 'Timepoint' }
      ],
      rows: [
        ['120', '115', '108'],
        ['135', '129', '121'],
        ['140', '133', '125']
      ]
    },

    anova: {
      badge: 'Wide format  outcome + grouping columns',
      rule:  'One numeric outcome column. Two grouping columns, each containing category labels.',
      note:  'This matches SPSS GLM format. R/Python typically use long (stacked) format instead.',
      cols: [
        { label: 'Salary',  role: 'outcome', roleLabel: 'Outcome' },
        { label: 'Role',    role: 'cat',     roleLabel: 'Group A' },
        { label: 'Region',  role: 'cat',     roleLabel: 'Group B' }
      ],
      rows: [
        ['5 200', 'Analyst', 'US'],
        ['6 100', 'Manager', 'EU'],
        ['5 800', 'Analyst', 'EU']
      ]
    },

    'anova-oneway': {
      badge: 'Wide format  outcome + one grouping column',
      rule:  'One numeric outcome column. One grouping column containing category labels.',
      note:  'This matches SPSS GLM format. R/Python typically use long (stacked) format instead.',
      cols: [
        { label: 'Salary', role: 'outcome', roleLabel: 'Outcome' },
        { label: 'Role',   role: 'cat',     roleLabel: 'Group A' }
      ],
      rows: [
        ['5 200', 'Analyst'],
        ['6 100', 'Manager'],
        ['5 800', 'Analyst']
      ]
    },

    mixed: {
      badge: '  Long format  one row per measurement',
      rule:  'Multiple rows per subject. Each row = one occasion. Outcome, group, time, and subject ID all in separate columns.',
      note:  'This matches SPSS Mixed Models format. Wide (one column per timepoint) is not supported here.',
      isLong: true,
      cols: [
        { label: 'id',    role: 'id',      roleLabel: 'Subject ID' },
        { label: 'group', role: 'cat',     roleLabel: 'Group'      },
        { label: 'time',  role: 'time',    roleLabel: 'Time'       },
        { label: 'score', role: 'outcome', roleLabel: 'Outcome'    }
      ],
      rows: [
        ['1', 'A', '0', '48'],
        ['1', 'A', '1', '52'],
        ['2', 'B', '0', '50'],
        ['2', 'B', '1', '58']
      ]
    },

    logistic: {
      badge: 'One row per observation',
      rule:  'Binary response column coded 0/1. Numeric and categorical predictors in separate columns.',
      note:  'The outcome must contain exactly two values: 0 and 1. One row = one case.',
      cols: [
        { label: 'Churn',  role: 'outcome', roleLabel: 'Binary Y' },
        { label: 'Age',    role: 'meas', roleLabel: 'Numeric X' },
        { label: 'Tenure', role: 'meas', roleLabel: 'Numeric X' },
        { label: 'Region', role: 'cat',     roleLabel: 'Categorical X' }
      ],
      rows: [
        ['1', '42', '3',  'US'],
        ['0', '35', '8',  'EU'],
        ['0', '51', '12', 'US']
      ]
    },

    factor: {
      badge: 'Wide format  one row per case',
      rule:  'Each row = one observation. Each numeric column = one measured item or scale score.',
      note:  'Select at least two numeric variables. Categorical columns are not used in factor extraction.',
      cols: [
        { label: 'Item1', role: 'meas', roleLabel: 'Measure' },
        { label: 'Item2', role: 'meas', roleLabel: 'Measure' },
        { label: 'Item3', role: 'meas', roleLabel: 'Measure' },
        { label: 'Item4', role: 'meas', roleLabel: 'Measure' }
      ],
      rows: [
        ['4.2', '3.8', '4.0', '3.5'],
        ['2.1', '2.4', '2.0', '2.2'],
        ['5.0', '4.8', '4.9', '4.7']
      ]
    },

    pca: {
      badge: 'Wide format  one row per case',
      rule:  'Each row = one observation. Each numeric column = one variable to reduce.',
      note:  'PCA extracts orthogonal components from correlated numeric columns. Need at least 2 variables.',
      cols: [
        { label: 'Var A', role: 'meas', roleLabel: 'Variable' },
        { label: 'Var B', role: 'meas', roleLabel: 'Variable' },
        { label: 'Var C', role: 'meas', roleLabel: 'Variable' }
      ],
      rows: [
        ['12.4', '8.1', '5.2'],
        ['15.0', '9.3', '6.1'],
        ['11.2', '7.8', '4.9']
      ]
    },

    cluster: {
      badge: 'Wide format  one row per case',
      rule:  'Each row = one observation. Select numeric columns that define similarity between cases.',
      note:  'Rows with missing values on any included variable are excluded. Standardisation is recommended.',
      cols: [
        { label: 'Age', role: 'meas', roleLabel: 'Measure' },
        { label: 'Income', role: 'meas', roleLabel: 'Measure' },
        { label: 'Spend', role: 'meas', roleLabel: 'Measure' }
      ],
      rows: [
        ['34', '52000', '1200'],
        ['41', '61000', '980'],
        ['29', '48000', '1500']
      ]
    },

    pareto: {
      badge: 'Long format  one row per item',
      rule:  'One category column (labels to rank). Optional numeric values column to sum — otherwise rows are counted.',
      note:  'Classic ABC / 80-20 analysis: aggregate by category, sort descending, compute cumulative share.',
      cols: [
        { label: 'Product', role: 'cat', roleLabel: 'Category' },
        { label: 'Revenue', role: 'outcome', roleLabel: 'Values' }
      ],
      rows: [
        ['Widget A', '4200'],
        ['Widget B', '3100'],
        ['Widget C', '1800']
      ]
    }
  };

  /**
   * Build the HTML string for the guide.
   */
  function buildHtml(cfg) {
    var colCount = cfg.cols.length;
    var gridCols = 'repeat(' + colCount + ',1fr)';

    // Role header row
    var headerCells = cfg.cols.map(function (c) {
      return '<div class="ds-cell ds-role-label role-' + c.role + '" data-role="' + c.role + '">' + c.roleLabel + '</div>';
    }).join('');

    // Column label row
    var colLabelCells = cfg.cols.map(function (c) {
      return '<div class="ds-cell ds-col-name role-' + c.role + '" data-role="' + c.role + '">' + c.label + '</div>';
    }).join('');

    // Data rows
    var dataRows = cfg.rows.map(function (row) {
      var cells = row.map(function (val, i) {
        var role = cfg.cols[i] ? cfg.cols[i].role : '';
        return '<div class="ds-cell ds-data role-' + role + '-data" data-role="' + role + '">' + val + '</div>';
      }).join('');
      return '<div class="ds-row" style="grid-template-columns:' + gridCols + ';">' + cells + '</div>';
    }).join('');

    var badgeCls = cfg.isLong ? 'ds-badge ds-badge--long' : 'ds-badge';
    var noteHtml = cfg.note
      ? '  <div class="ds-note"><i class="fa-solid fa-circle-info"></i> ' + cfg.note + '</div>'
      : '';

    return [
      '<div class="ds-guide">',
      '  <button class="ds-toggle" type="button" aria-expanded="true" title="Toggle guide">',
      '    <i class="fa-solid fa-triangle-exclamation ds-guide-warn"></i>',
      '    <span class="ds-guide-title">Data Structure Guide</span>',
      '    <span class="' + badgeCls + '">' + cfg.badge + '</span>',
      '    <i class="fa-solid fa-chevron-down ds-chevron"></i>',
      '  </button>',
      '  <div class="ds-body">',
      '    <div class="ds-grid-wrap">',
      '      <div class="ds-grid">',
      '        <div class="ds-row ds-header" style="grid-template-columns:' + gridCols + ';">' + headerCells + '</div>',
      '        <div class="ds-row ds-colnames" style="grid-template-columns:' + gridCols + ';">' + colLabelCells + '</div>',
      dataRows,
      '      </div>',
      '    </div>',
      '    <div class="ds-caption">' + cfg.rule + '</div>',
      noteHtml,
      '  </div>',
      '</div>'
    ].join('\n');
  }

  /**
   * Wire hover highlights  hovering a role header dims the others.
   */
  function wireHover(container) {
    var cells = container.querySelectorAll('[data-role]');
    var headers = container.querySelectorAll('.ds-role-label');

    headers.forEach(function (hdr) {
      var role = hdr.getAttribute('data-role');

      hdr.addEventListener('mouseenter', function () {
        cells.forEach(function (c) {
          c.classList.toggle('ds-dim', c.getAttribute('data-role') !== role);
          c.classList.toggle('ds-highlight', c.getAttribute('data-role') === role);
        });
      });

      hdr.addEventListener('mouseleave', function () {
        cells.forEach(function (c) {
          c.classList.remove('ds-dim', 'ds-highlight');
        });
      });
    });
  }

  /**
   * Render the guide into the given container element or ID.
   * @param {'independent'|'independent-two'|'dependent'|'anova'|'mixed'} type
   * @param {string|HTMLElement} target   element or element ID
   * @param {{ collapsed?: boolean }} [opts]
   */
  function render(type, target, opts) {
    var cfg = CONFIGS[type];
    if (!cfg) { console.warn('[DsGuide] unknown type:', type); return; }

    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) { console.warn('[DsGuide] container not found:', target); return; }

    el.innerHTML = buildHtml(cfg);

    var guide  = el.querySelector('.ds-guide');
    var toggle = el.querySelector('.ds-toggle');
    var body   = el.querySelector('.ds-body');

    // Apply initial collapsed state
    if (opts && opts.collapsed) {
      guide.classList.add('ds-collapsed');
      toggle.setAttribute('aria-expanded', 'false');
    }

    // Wire toggle button
    toggle.addEventListener('click', function () {
      var isCollapsed = guide.classList.toggle('ds-collapsed');
      toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    });

    wireHover(el);
  }

  /**
   * Convenience: re-render when the user switches between compare modes.
   * @param {'two-vars'|'k-plus'} compareMode   value of the dataMode radio
   * @param {string|HTMLElement}  target
   */
  function renderIndependent(compareMode, target, opts) {
    render(compareMode === 'two-vars' ? 'independent-two' : 'independent', target, opts);
  }

  /**
   * Convenience: re-render for repeated-measures mode switches.
   * @param {'two-vars'|'k-plus'} compareMode
   * @param {string|HTMLElement}  target
   */
  function renderDependent(compareMode, target, opts) {
    render(compareMode === 'two-vars' ? 'dependent' : 'dependent-kplus', target, opts);
  }

  /**
   * Convenience: re-render for ANOVA type switches.
   * @param {'one-way'|'two-way'} anovaType
   * @param {string|HTMLElement}  target
   */
  function renderAnova(anovaType, target, opts) {
    render(anovaType === 'two-way' ? 'anova' : 'anova-oneway', target, opts);
  }

  global.DsGuide = { render: render, renderIndependent: renderIndependent, renderDependent: renderDependent, renderAnova: renderAnova, CONFIGS: CONFIGS };
})(typeof window !== 'undefined' ? window : this);


/**
 * ds-guide.js  –  Data Structure Guide panel
 * Renders a role-coloured mini-grid and one-line rule for each input module.
 * Usage: DsGuide.render('independent', 'dsGuideContainer');
 */
(function (global) {
  'use strict';

  var CONFIGS = {
    independent: {
      badge: 'Wide format — each column is a group',
      rule:  'Each column = one group. Rows are independent observations of the same outcome variable.',
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

    dependent: {
      badge: 'Wide format — columns are measurements',
      rule:  'Each row = the same subject. Columns = repeated time-points or conditions.',
      cols: [
        { label: 'Before',  role: 'meas', roleLabel: 'Measurement' },
        { label: 'After',   role: 'meas', roleLabel: 'Measurement' }
      ],
      rows: [
        ['120', '110'],
        ['135', '128'],
        ['140', '130']
      ]
    },

    anova: {
      badge: 'Wide format — one outcome + category columns',
      rule:  'One outcome column. One or more grouping (category) columns.',
      cols: [
        { label: 'Salary',   role: 'outcome', roleLabel: 'Outcome'  },
        { label: 'Role',     role: 'cat',     roleLabel: 'Category' },
        { label: 'Region',   role: 'cat',     roleLabel: 'Category' }
      ],
      rows: [
        ['5 200', 'Analyst', 'US'],
        ['6 100', 'Manager', 'EU'],
        ['5 800', 'Analyst', 'EU']
      ]
    },

    mixed: {
      badge: '⚠ Long format — one row per measurement',
      rule:  'Multiple rows per subject. Outcome in a single column. Time = repeated index.',
      isLong: true,
      cols: [
        { label: 'id',    role: 'id',      roleLabel: 'Subject ID' },
        { label: 'group', role: 'cat',     roleLabel: 'Category'   },
        { label: 'time',  role: 'time',    roleLabel: 'Time'       },
        { label: 'score', role: 'outcome', roleLabel: 'Outcome'    }
      ],
      rows: [
        ['1', 'A', '0', '48'],
        ['1', 'A', '1', '52'],
        ['2', 'B', '0', '50'],
        ['2', 'B', '1', '58']
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

    return [
      '<div class="ds-guide">',
      '  <div class="ds-guide-head">',
      '    <span class="ds-guide-title">Data Structure Guide</span>',
      '    <span class="' + badgeCls + '">' + cfg.badge + '</span>',
      '  </div>',
      '  <div class="ds-grid">',
      '    <div class="ds-row ds-header" style="grid-template-columns:' + gridCols + ';">' + headerCells + '</div>',
      '    <div class="ds-row ds-colnames" style="grid-template-columns:' + gridCols + ';">' + colLabelCells + '</div>',
      dataRows,
      '  </div>',
      '  <div class="ds-caption">' + cfg.rule + '</div>',
      '</div>'
    ].join('\n');
  }

  /**
   * Wire hover highlights — hovering a role header dims the others.
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
   * @param {'independent'|'dependent'|'anova'|'mixed'} type
   * @param {string|HTMLElement} target  – element or element ID
   */
  function render(type, target) {
    var cfg = CONFIGS[type];
    if (!cfg) { console.warn('[DsGuide] unknown type:', type); return; }

    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) { console.warn('[DsGuide] container not found:', target); return; }

    el.innerHTML = buildHtml(cfg);
    wireHover(el);
  }

  global.DsGuide = { render: render, CONFIGS: CONFIGS };
})(typeof window !== 'undefined' ? window : this);

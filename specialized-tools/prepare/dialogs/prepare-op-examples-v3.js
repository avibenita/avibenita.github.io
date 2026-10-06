/**
 * Before / how / after examples for Prepare Dataset operations.
 * The user advances each step; nothing plays on a timer.
 */
(function (root) {
  'use strict';

  var SKIP_KEY = 'statisticoPrepSkipAutoExample';
  var mounted = false;
  var step = 0;
  var currentType = '';

  var EXAMPLES = {
    defineMissing: {
      title: 'Define missing-value codes',
      beforeNote: 'Score uses 99 to mean “no answer”.',
      howNote: 'Treat 99 as missing in Score. ID is unchanged.',
      afterNote: 'In the new sheet, 99 becomes blank. The original sheet still has 99.',
      headers: ['ID', 'Score'],
      before: [['A', '99'], ['B', '12']],
      after: [['A', ''], ['B', '12']],
      hitBefore: ['0,1'],
      hitAfter: ['0,1']
    },
    dropVariables: {
      title: 'Drop selected variables',
      beforeNote: 'Notes is empty and not needed for analysis.',
      howNote: 'Omit Notes from the prepared worksheet. Other columns stay.',
      afterNote: 'The new sheet has ID and Score only. Notes remains on the original sheet.',
      headers: ['ID', 'Notes', 'Score'],
      before: [['A', '', '8'], ['B', '', '5']],
      afterHeaders: ['ID', 'Score'],
      after: [['A', '8'], ['B', '5']],
      hitBefore: ['col:1']
    },
    recode: {
      title: 'Recode values',
      beforeNote: 'Sex is coded 1 and 2.',
      howNote: '1 → Female, 2 → Male. A new column is added; Sex is kept.',
      afterNote: 'Sex_recode is ready for analysis. Source values are unchanged.',
      headers: ['ID', 'Sex'],
      before: [['A', '1'], ['B', '2'], ['C', '1']],
      afterHeaders: ['ID', 'Sex', 'Sex_recode'],
      after: [['A', '1', 'Female'], ['B', '2', 'Male'], ['C', '1', 'Female']],
      hitBefore: ['col:1'],
      hitAfter: ['col:2']
    },
    compute: {
      title: 'Compute a new variable',
      beforeNote: 'Q1 and Q2 are item scores.',
      howNote: 'New column Mean = (Q1 + Q2) / 2. Existing columns are kept.',
      afterNote: 'Mean is added on the right of the prepared sheet.',
      headers: ['ID', 'Q1', 'Q2'],
      before: [['A', '4', '2'], ['B', '5', '5']],
      afterHeaders: ['ID', 'Q1', 'Q2', 'Mean'],
      after: [['A', '4', '2', '3'], ['B', '5', '5', '5']],
      hitAfter: ['col:3']
    },
    reverseScore: {
      title: 'Reverse-score items',
      beforeNote: 'Q1 is a 1–5 item that runs the opposite way.',
      howNote: 'Q1_r = 1 + 5 − Q1. Original Q1 is kept.',
      afterNote: 'High agreement on the reversed item now has a high score.',
      headers: ['ID', 'Q1'],
      before: [['A', '1'], ['B', '5'], ['C', '2']],
      afterHeaders: ['ID', 'Q1', 'Q1_r'],
      after: [['A', '1', '5'], ['B', '5', '1'], ['C', '2', '4']],
      hitBefore: ['col:1'],
      hitAfter: ['col:2']
    },
    composite: {
      title: 'Create a composite score',
      beforeNote: 'Three Likert items belong to the same scale.',
      howNote: 'Engagement = mean of Q1, Q2, Q3. Items stay as columns.',
      afterNote: 'The new score is ready to use as one variable.',
      headers: ['ID', 'Q1', 'Q2', 'Q3'],
      before: [['A', '4', '5', '3'], ['B', '2', '2', '1']],
      afterHeaders: ['ID', 'Q1', 'Q2', 'Q3', 'Engagement'],
      after: [['A', '4', '5', '3', '4'], ['B', '2', '2', '1', '1.67']],
      hitBefore: ['col:1', 'col:2', 'col:3'],
      hitAfter: ['col:4']
    },
    harmonize: {
      title: 'Harmonize category labels',
      beforeNote: 'The same group is spelled Male and male.',
      howNote: 'Safe capitalization variants are mapped to Male.',
      afterNote: 'One consistent label. Meaning was not merged with a different category.',
      headers: ['ID', 'Sex'],
      before: [['A', 'Male'], ['B', 'male'], ['C', 'Male']],
      after: [['A', 'Male'], ['B', 'Male'], ['C', 'Male']],
      hitBefore: ['1,1'],
      hitAfter: ['1,1']
    },
    filter: {
      title: 'Filter / select cases',
      beforeNote: 'Three people, including one under 18.',
      howNote: 'Keep rows where Age > 18. Columns are not removed.',
      afterNote: 'The child row is left off the new sheet. The original sheet is unchanged.',
      headers: ['ID', 'Age'],
      before: [['A', '12'], ['B', '22'], ['C', '40']],
      after: [['B', '22'], ['C', '40']],
      hitBefore: ['row:0']
    },
    flagDuplicates: {
      title: 'Flag duplicate rows',
      beforeNote: 'Row 2 is an exact copy of row 1.',
      howNote: 'The first copy stays 0. Later identical rows get 1. Nothing is deleted.',
      afterNote: 'You can filter on duplicate_flag later if you want to drop copies.',
      headers: ['ID', 'Score'],
      before: [['A', '8'], ['A', '8'], ['B', '3']],
      afterHeaders: ['ID', 'Score', 'duplicate_flag'],
      after: [['A', '8', '0'], ['A', '8', '1'], ['B', '3', '0']],
      hitBefore: ['row:1'],
      hitAfter: ['1,2']
    },
    wideToLong: {
      title: 'Wide to long',
      beforeNote: 'Pre and Post are two occasions in columns.',
      howNote: 'Stack Pre and Post into rows. ID is copied onto every long row.',
      afterNote: 'Occasion holds the old column name. Value holds the score.',
      headers: ['ID', 'Pre', 'Post'],
      before: [['A', '3', '5'], ['B', '4', '4']],
      afterHeaders: ['ID', 'Occasion', 'Value'],
      after: [['A', 'Pre', '3'], ['A', 'Post', '5'], ['B', 'Pre', '4'], ['B', 'Post', '4']],
      hitBefore: ['col:1', 'col:2'],
      hitAfter: ['col:1', 'col:2']
    },
    longToWide: {
      title: 'Long to wide',
      beforeNote: 'Pre and Post are two rows per person.',
      howNote: 'Spread Occasion into columns. One row per ID.',
      afterNote: 'Pre and Post are columns again. Age is copied once per person.',
      headers: ['ID', 'Age', 'Occasion', 'Value'],
      before: [['A', '22', 'Pre', '3'], ['A', '22', 'Post', '5'], ['B', '30', 'Pre', '4'], ['B', '30', 'Post', '4']],
      afterHeaders: ['ID', 'Age', 'Pre', 'Post'],
      after: [['A', '22', '3', '5'], ['B', '30', '4', '4']],
      hitBefore: ['col:2', 'col:3'],
      hitAfter: ['col:2', 'col:3']
    },
    transpose: {
      title: 'Transpose',
      beforeNote: 'People are rows. Age and Score are columns.',
      howNote: 'The first column becomes the new headers. Current headers become the first column.',
      afterNote: 'Each original variable is now a row.',
      headers: ['ID', 'Age', 'Score'],
      before: [['A', '22', '3'], ['B', '30', '4']],
      afterHeaders: ['ID', 'A', 'B'],
      after: [['Age', '22', '30'], ['Score', '3', '4']],
      hitBefore: ['col:0'],
      hitAfter: ['row:0']
    }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function cellText(v) {
    if (v == null || v === '') return '<span class="ex-miss">missing</span>';
    return esc(v);
  }

  function hitSet(hits) {
    var set = {};
    (hits || []).forEach(function (h) { set[h] = true; });
    return set;
  }

  function isHit(set, r, c) {
    return !!(set[r + ',' + c] || set['col:' + c] || set['row:' + r]);
  }

  function tableHtml(headers, rows, hits) {
    var set = hitSet(hits);
    var th = headers.map(function (h, c) {
      return '<th class="' + (set['col:' + c] ? 'ex-hit' : '') + '">' + esc(h) + '</th>';
    }).join('');
    var body = rows.map(function (row, r) {
      var tds = headers.map(function (_h, c) {
        return '<td class="' + (isHit(set, r, c) ? 'ex-hit' : '') + '">' + cellText(row[c]) + '</td>';
      }).join('');
      return '<tr class="' + (set['row:' + r] ? 'ex-hit-row' : '') + '">' + tds + '</tr>';
    }).join('');
    return '<table class="ex-tbl"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function skipAuto() {
    try { return root.sessionStorage.getItem(SKIP_KEY) === '1'; } catch (e) { return false; }
  }

  function setSkipAuto(on) {
    try { root.sessionStorage.setItem(SKIP_KEY, on ? '1' : '0'); } catch (e) {}
  }

  function $(id) { return document.getElementById(id); }

  function mount() {
    if (mounted || !document.body) return;
    mounted = true;
    var style = document.createElement('style');
    style.textContent = [
      '.ex-ov{position:fixed;inset:0;background:rgba(8,12,20,.62);z-index:12000;display:none;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(4px);}',
      '.ex-ov.on{display:flex;}',
      '.ex-card{width:min(420px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;border-radius:14px;background:var(--cfg-surface,#161b27);color:var(--cfg-text,#e2e8f0);border:1px solid var(--cfg-border,#2d3a52);box-shadow:0 18px 50px rgba(0,0,0,.4);}',
      '.ex-head{flex:0 0 auto;display:flex;align-items:flex-start;gap:8px;padding:12px 12px 8px;border-bottom:1px solid var(--cfg-border,#2d3a52);}',
      '.ex-head h3{margin:0;font-size:14px;font-weight:800;}',
      '.ex-head p{margin:3px 0 0;font-size:11px;color:var(--cfg-text3,#94a3b8);}',
      '.ex-x{margin-left:auto;border:0;background:transparent;color:var(--cfg-text3,#94a3b8);font-size:18px;cursor:pointer;line-height:1;}',
      '.ex-body{flex:1 1 auto;overflow:auto;padding:10px 12px 12px;}',
      '.ex-phase{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--prep-acc,#14b8a6);margin-bottom:6px;}',
      '.ex-dot{width:7px;height:7px;border-radius:99px;background:#334155;cursor:pointer;border:0;padding:0;}',
      '.ex-dot.on{background:var(--prep-acc,#14b8a6);box-shadow:0 0 0 4px rgba(20,184,166,.18);}',
      '.ex-note{font-size:12px;line-height:1.4;color:var(--cfg-text2,#cbd5e1);min-height:2.6em;margin:0 0 8px;}',
      '.ex-tbl{width:100%;border-collapse:collapse;font-size:11px;background:var(--cfg-input-bg,#0d1117);border-radius:8px;overflow:hidden;}',
      '.ex-tbl th,.ex-tbl td{padding:6px 8px;border-bottom:1px solid var(--cfg-border,#2d3a52);text-align:left;}',
      '.ex-tbl th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--cfg-text3,#94a3b8);}',
      '.ex-hit,.ex-hit-row td{background:rgba(20,184,166,.16);}',
      '[data-theme="light"] .ex-hit,[data-theme="light"] .ex-hit-row td{background:rgba(15,118,110,.12);}',
      '.ex-hit{outline:1px solid rgba(20,184,166,.55);}',
      '.ex-miss{font-style:italic;color:#f97316;font-weight:700;}',
      '.ex-howbox{margin:8px 0;padding:8px 10px;border-radius:10px;border:1px dashed var(--prep-acc,#14b8a6);color:var(--prep-acc,#14b8a6);font-size:12px;font-weight:700;text-align:center;}',
      '.ex-foot{flex:0 0 auto;display:flex;flex-wrap:nowrap;gap:8px;align-items:center;padding:10px 12px 12px;border-top:1px solid var(--cfg-border,#2d3a52);background:inherit;}',
      '.ex-btn{border:0;border-radius:8px;padding:9px 14px;font-size:12px;font-weight:800;cursor:pointer;}',
      '.ex-btn:disabled{opacity:.4;cursor:default;}',
      '.ex-btn.pri{flex:1;min-width:96px;background:#0f766e;color:#fff;}',
      '[data-theme="light"] .ex-btn.pri{background:#0f766e;color:#fff;}',
      '.ex-btn.ghost{background:transparent;color:var(--cfg-text2,#94a3b8);border:1px solid var(--cfg-border,#2d3a52);}',
      '.ex-skip{margin-left:auto;font-size:10px;color:var(--cfg-text3,#64748b);display:flex;gap:5px;align-items:center;white-space:nowrap;}'
    ].join('');
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.className = 'ex-ov';
    ov.id = 'prepExOverlay';
    ov.innerHTML =
      '<div class="ex-card" role="dialog" aria-modal="true">' +
        '<div class="ex-head"><div><h3 id="exTitle"></h3><p>Tiny example — not your data</p></div>' +
        '<button type="button" class="ex-x" id="exClose" aria-label="Close">×</button></div>' +
        '<div class="ex-body">' +
          '<div class="ex-phase">' +
            '<button type="button" class="ex-dot" id="exDot0" data-step="0" title="Before"></button>' +
            '<button type="button" class="ex-dot" id="exDot1" data-step="1" title="How"></button>' +
            '<button type="button" class="ex-dot" id="exDot2" data-step="2" title="After"></button>' +
            '<span id="exPhase">Before</span></div>' +
          '<p class="ex-note" id="exNote"></p>' +
          '<div id="exHowBox" class="ex-howbox" style="display:none;"></div>' +
          '<div id="exTable"></div>' +
        '</div>' +
        '<div class="ex-foot">' +
          '<button type="button" class="ex-btn ghost" id="exBack">Back</button>' +
          '<button type="button" class="ex-btn pri" id="exNext">Next</button>' +
          '<button type="button" class="ex-btn ghost" id="exDone">Got it</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) { if (e.target === ov) hide(); });
    $('exClose').onclick = hide;
    $('exDone').onclick = hide;
    $('exBack').onclick = function () { go(step - 1); };
    $('exNext').onclick = function () {
      if (step >= 2) hide();
      else go(step + 1);
    };
    ['exDot0', 'exDot1', 'exDot2'].forEach(function (id) {
      $(id).onclick = function () { go(Number(this.getAttribute('data-step'))); };
    });
    $('exSkipAuto') && ($('exSkipAuto').onchange = function () { setSkipAuto($('exSkipAuto').checked); });
  }

  function hide() {
    var ov = $('prepExOverlay');
    if (ov) ov.classList.remove('on');
  }

  function setPhase(i, label) {
    ['exDot0', 'exDot1', 'exDot2'].forEach(function (id, n) {
      $(id).classList.toggle('on', n <= i);
    });
    $('exPhase').textContent = label;
    $('exBack').disabled = i <= 0;
    $('exNext').textContent = i >= 2 ? 'Done' : 'Next';
  }

  function go(n) {
    var ex = EXAMPLES[currentType];
    if (!ex) return;
    step = Math.max(0, Math.min(2, n));
    var afterHeaders = ex.afterHeaders || ex.headers;
    if (step === 0) {
      setPhase(0, 'Before');
      $('exNote').textContent = ex.beforeNote;
      $('exHowBox').style.display = 'none';
      $('exTable').innerHTML = tableHtml(ex.headers, ex.before, null);
    } else if (step === 1) {
      setPhase(1, 'How');
      $('exNote').textContent = ex.howNote;
      $('exHowBox').style.display = '';
      $('exHowBox').textContent = ex.howNote;
      $('exTable').innerHTML = tableHtml(ex.headers, ex.before, ex.hitBefore);
    } else {
      setPhase(2, 'After');
      $('exNote').textContent = ex.afterNote;
      $('exHowBox').style.display = 'none';
      $('exTable').innerHTML = tableHtml(afterHeaders, ex.after, ex.hitAfter);
    }
  }

  function play(type) {
    mount();
    if (!EXAMPLES[type]) return;
    currentType = type;
    var ov = $('prepExOverlay');
    ov.setAttribute('data-op', type);
    ov.classList.add('on');
    $('exSkipAuto') && ($('exSkipAuto').checked = skipAuto());
    $('exTitle').textContent = EXAMPLES[type].title;
    go(0);
  }

  function show(type, opts) {
    opts = opts || {};
    if (!EXAMPLES[type]) return;
    if (opts.auto && skipAuto()) return;
    play(type);
  }

  root.StatisticoPrepareExamples = {
    show: show,
    hide: hide,
    has: function (type) { return !!EXAMPLES[type]; }
  };
})(typeof window !== 'undefined' ? window : this);

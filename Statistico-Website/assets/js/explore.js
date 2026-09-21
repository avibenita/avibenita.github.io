(function () {
  'use strict';

  var SYNONYMS = {
    roc: 'logistic roc classification',
    auc: 'logistic roc auc',
    classification: 'logistic classification',
    'odds ratio': 'logistic odds',
    binary: 'logistic binary',
    't test': 'independent means',
    ttest: 'independent means',
    'mann whitney': 'independent means',
    welch: 'independent means',
    'paired t': 'paired repeated',
    wilcoxon: 'paired repeated',
    friedman: 'paired repeated mixed',
    kruskal: 'anova',
    'post hoc': 'anova post hoc',
    tukey: 'anova post hoc',
    cronbach: 'reliability cronbach alpha',
    alpha: 'reliability cronbach alpha',
    omega: 'reliability omega',
    questionnaire: 'reliability factor',
    'internal consistency': 'reliability',
    'sample size': 'power sample size',
    power: 'power sample size',
    forest: 'meta forest',
    efa: 'factor analysis',
    pca: 'principal component',
    bubble: 'multivariable visualisation',
    recode: 'data manipulation',
    'chi square': 'contingency',
    crosstab: 'contingency'
  };

  var STOP = {
    a: 1, an: 1, and: 1, for: 1, of: 1, or: 1, the: 1, to: 1, with: 1
  };

  var state = {
    mode: 'method',
    query: '',
    goal: '',
    family: '',
    product: '',
    kind: '',
    outcome: '',
    groups: '',
    design: '',
    sort: 'family',
    sortDir: 'asc'
  };

  var els = {};

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function expandQuery(raw) {
    var text = normalize(raw);
    if (!text) return '';
    var keys = Object.keys(SYNONYMS).sort(function (a, b) { return b.length - a.length; });
    keys.forEach(function (phrase) {
      var re = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      text = text.replace(re, SYNONYMS[phrase]);
    });
    return text;
  }

  function tokensOf(text) {
    return normalize(text).split(' ').filter(function (t) { return t && !STOP[t]; });
  }

  function readCards() {
    return Array.prototype.slice.call(document.querySelectorAll('.cap-card'));
  }

  function readRows() {
    return Array.prototype.slice.call(document.querySelectorAll('.method-row'));
  }

  function itemHaystack(el) {
    if (el._hay) return el._hay;
    var nameEl = el.querySelector('.row-name, h3');
    var blurbEl = el.querySelector('.row-blurb, .cap-blurb');
    el._hay = normalize([
      el.getAttribute('data-id'),
      el.getAttribute('data-parent'),
      el.getAttribute('data-keywords'),
      el.getAttribute('data-tags'),
      el.getAttribute('data-goals'),
      el.getAttribute('data-name'),
      nameEl && nameEl.textContent,
      blurbEl && blurbEl.textContent
    ].join(' '));
    return el._hay;
  }

  function scoreItem(el, tokens) {
    if (!tokens.length) return 1;
    var hay = itemHaystack(el);
    var title = normalize((el.getAttribute('data-name') || (el.querySelector('.row-name, h3') || {}).textContent || ''));
    var hits = 0;
    tokens.forEach(function (token) {
      if (title === token || title.indexOf(token) >= 0) hits += 3;
      else if (hay.indexOf(token) >= 0) hits += 1;
    });
    return hits / tokens.length;
  }

  function highlightTags(el, tokens) {
    el.querySelectorAll('.cap-tags li').forEach(function (tag) {
      var text = normalize(tag.textContent);
      var match = tokens.some(function (token) { return text.indexOf(token) >= 0; });
      tag.classList.toggle('is-match', match);
    });
  }

  function matchesFilters(el, tokens) {
    if (state.goal && (el.getAttribute('data-goals') || '').indexOf(state.goal) < 0) return 0;
    if (state.family && el.getAttribute('data-family') !== state.family) return 0;
    if (state.product && el.getAttribute('data-product') !== state.product) return 0;
    if (state.kind && el.getAttribute('data-kind') !== state.kind) return 0;
    if (state.outcome) {
      var outcomes = (el.getAttribute('data-outcome') || '').split(/\s+/);
      if (outcomes.indexOf(state.outcome) < 0) return 0;
    }
    if (state.groups) {
      var groups = (el.getAttribute('data-groups') || '').split(/\s+/);
      if (groups.indexOf(state.groups) < 0) return 0;
    }
    if (state.design) {
      var designs = (el.getAttribute('data-design') || '').split(/\s+/);
      if (designs.indexOf(state.design) < 0) return 0;
    }
    return scoreItem(el, tokens);
  }

  function sortValue(row, key) {
    if (key === 'family') {
      return String(row.getAttribute('data-family-order') || '99').padStart(2, '0') + ' ' + normalize(row.getAttribute('data-name'));
    }
    if (key === 'name') return normalize(row.getAttribute('data-name'));
    if (key === 'product') return normalize(row.getAttribute('data-product'));
    if (key === 'kind') return normalize(row.getAttribute('data-kind'));
    return '';
  }

  function sortRows() {
    var tbody = document.querySelector('#method-table tbody');
    if (!tbody) return;
    var rows = readRows();
    rows.sort(function (a, b) {
      var av = sortValue(a, state.sort);
      var bv = sortValue(b, state.sort);
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return state.sortDir === 'desc' ? -cmp : cmp;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
  }

  function syncSortUi() {
    document.querySelectorAll('.sort-btn').forEach(function (btn) {
      var on = btn.getAttribute('data-sort') === state.sort;
      btn.classList.toggle('is-active', on);
      var icon = btn.querySelector('i');
      if (!icon) return;
      icon.className = on
        ? (state.sortDir === 'desc' ? 'fa-solid fa-sort-down' : 'fa-solid fa-sort-up')
        : 'fa-solid fa-sort';
    });
  }

  function applyFilters() {
    var expanded = expandQuery(state.query);
    var tokens = tokensOf(expanded);
    var shown = 0;

    readCards().forEach(function (card) {
      var score = matchesFilters(card, tokens);
      var visible = score > 0;
      card.hidden = !visible;
      card.classList.toggle('is-hit', visible && tokens.length > 0 && score >= 1);
      highlightTags(card, visible ? tokens : []);
    });

    readRows().forEach(function (row) {
      var score = matchesFilters(row, tokens);
      var visible = score > 0;
      row.hidden = !visible;
      row.classList.toggle('is-hit', visible && tokens.length > 0 && score >= 1);
      highlightTags(row, visible ? tokens : []);
      if (visible) shown += 1;
    });

    document.querySelectorAll('.family-block').forEach(function (block) {
      var any = block.querySelector('.cap-card:not([hidden])');
      block.hidden = !any;
    });

    var noun = state.mode === 'method'
      ? (shown === 1 ? 'method' : 'methods')
      : (shown === 1 ? 'capability' : 'capabilities');
    var countText = shown + ' ' + noun;
    document.querySelectorAll('.results-count').forEach(function (el) {
      el.textContent = countText;
    });
    if (els.empty) {
      els.empty.classList.toggle('is-visible', shown === 0);
    }
    if (els.clearBtn) {
      els.clearBtn.classList.toggle('is-visible', Boolean(state.query));
    }
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.mode && state.mode !== 'method') params.set('mode', state.mode);
    if (state.query) params.set('q', state.query);
    if (state.goal) params.set('goal', state.goal);
    if (state.family) params.set('family', state.family);
    if (state.product) params.set('product', state.product);
    if (state.kind) params.set('kind', state.kind);
    if (state.outcome) params.set('outcome', state.outcome);
    if (state.groups) params.set('groups', state.groups);
    if (state.design) params.set('design', state.design);
    if (state.sort && state.sort !== 'family') params.set('sort', state.sort);
    if (state.sortDir && state.sortDir !== 'asc') params.set('dir', state.sortDir);
    var next = params.toString();
    var url = next ? window.location.pathname + '?' + next : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(function (tab) {
      var on = tab.getAttribute('data-mode') === mode;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.browse-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-panel') === mode);
    });
    if (els.catalogue) {
      els.catalogue.classList.toggle('is-table', mode === 'method');
      els.catalogue.classList.toggle('is-cards', mode !== 'method');
    }
    if (els.countCards) els.countCards.hidden = mode === 'method';
    if (mode !== 'goal') {
      state.goal = '';
      state.outcome = '';
      state.groups = '';
      state.design = '';
      syncGoalUi();
    }
    if (mode !== 'method') {
      state.kind = '';
      if (els.filterKind) els.filterKind.value = '';
    }
    if (mode === 'method' && !state.family && els.filterFamily) els.filterFamily.value = '';
    if (mode !== 'product') {
      /* keep family/product filters when staying in method */
    }
    if (mode === 'goal') {
      state.family = '';
      state.product = '';
      state.kind = '';
    }
    if (mode === 'product' && !state.product) {
      state.family = '';
      state.kind = '';
    }
    syncFilterChips();
    applyFilters();
    writeUrl();
  }

  function syncGoalUi() {
    document.querySelectorAll('.goal-chip').forEach(function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-goal') === state.goal);
    });
    if (els.navigator) {
      var open = state.goal === 'compare-groups';
      els.navigator.classList.toggle('is-open', open);
      els.navigator.hidden = !open;
    }
    document.querySelectorAll('.nav-opt').forEach(function (opt) {
      var key = opt.getAttribute('data-nav');
      opt.classList.toggle('is-active', state[key] === opt.getAttribute('data-value'));
    });
  }

  function syncFilterChips() {
    document.querySelectorAll('.family-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', (tab.getAttribute('data-family') || '') === state.family);
    });
    document.querySelectorAll('.product-tab').forEach(function (tab) {
      tab.classList.toggle('is-active', (tab.getAttribute('data-product') || '') === state.product);
    });
    document.querySelectorAll('.explore-try button').forEach(function (btn) {
      btn.classList.toggle('is-active', normalize(btn.getAttribute('data-q')) === normalize(state.query));
    });
    if (els.filterFamily && els.filterFamily.value !== state.family) els.filterFamily.value = state.family;
    if (els.filterProduct && els.filterProduct.value !== state.product) els.filterProduct.value = state.product;
    if (els.filterKind && els.filterKind.value !== state.kind) els.filterKind.value = state.kind;
  }

  function setGoal(goal) {
    state.goal = state.goal === goal ? '' : goal;
    if (state.goal !== 'compare-groups') {
      state.outcome = '';
      state.groups = '';
      state.design = '';
    }
    syncGoalUi();
    applyFilters();
    writeUrl();
  }

  function setSort(key) {
    if (state.sort === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sort = key;
      state.sortDir = 'asc';
    }
    sortRows();
    syncSortUi();
    writeUrl();
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    state.mode = params.get('mode') || 'method';
    state.query = params.get('q') || '';
    state.goal = params.get('goal') || '';
    state.family = params.get('family') || '';
    state.product = params.get('product') || '';
    state.kind = params.get('kind') || '';
    state.outcome = params.get('outcome') || '';
    state.groups = params.get('groups') || '';
    state.design = params.get('design') || '';
    state.sort = params.get('sort') || 'family';
    state.sortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
    if (els.input) els.input.value = state.query;
  }

  function bind() {
    els.input = document.getElementById('explore-q');
    els.clearBtn = document.getElementById('explore-clear');
    els.count = document.getElementById('explore-count');
    els.countCards = document.getElementById('explore-count-cards');
    els.empty = document.getElementById('explore-empty');
    els.navigator = document.getElementById('compare-navigator');
    els.catalogue = document.getElementById('explore-catalogue');
    els.filterFamily = document.getElementById('filter-family');
    els.filterProduct = document.getElementById('filter-product');
    els.filterKind = document.getElementById('filter-kind');

    document.querySelectorAll('.mode-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setMode(tab.getAttribute('data-mode'));
      });
    });

    document.querySelectorAll('.goal-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setGoal(chip.getAttribute('data-goal'));
      });
    });

    document.querySelectorAll('.nav-opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var key = opt.getAttribute('data-nav');
        var value = opt.getAttribute('data-value');
        state[key] = state[key] === value ? '' : value;
        syncGoalUi();
        applyFilters();
        writeUrl();
      });
    });

    document.querySelectorAll('.family-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var value = tab.getAttribute('data-family') || '';
        state.family = state.family === value ? '' : value;
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    });

    document.querySelectorAll('.product-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var value = tab.getAttribute('data-product') || '';
        state.product = state.product === value ? '' : value;
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    });

    document.querySelectorAll('.explore-try button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.query = btn.getAttribute('data-q') || '';
        if (els.input) els.input.value = state.query;
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    });

    if (els.filterFamily) {
      els.filterFamily.addEventListener('change', function () {
        state.family = els.filterFamily.value;
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    }
    if (els.filterProduct) {
      els.filterProduct.addEventListener('change', function () {
        state.product = els.filterProduct.value;
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    }
    if (els.filterKind) {
      els.filterKind.addEventListener('change', function () {
        state.kind = els.filterKind.value;
        applyFilters();
        writeUrl();
      });
    }

    document.querySelectorAll('.sort-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSort(btn.getAttribute('data-sort'));
      });
    });

    document.querySelectorAll('.method-row').forEach(function (row) {
      row.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;
        var href = row.getAttribute('data-href');
        if (href) window.location.href = href;
      });
      row.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        var href = row.getAttribute('data-href');
        if (!href) return;
        event.preventDefault();
        window.location.href = href;
      });
      row.tabIndex = 0;
    });

    if (els.input) {
      els.input.addEventListener('input', function () {
        state.query = els.input.value.trim();
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    }

    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', function () {
        state.query = '';
        if (els.input) els.input.value = '';
        syncFilterChips();
        applyFilters();
        writeUrl();
        els.input && els.input.focus();
      });
    }

    var reset = document.getElementById('explore-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        state.query = '';
        state.goal = '';
        state.family = '';
        state.product = '';
        state.kind = '';
        state.outcome = '';
        state.groups = '';
        state.design = '';
        if (els.input) els.input.value = '';
        syncGoalUi();
        syncFilterChips();
        applyFilters();
        writeUrl();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    readUrl();
    if (['goal', 'method', 'product'].indexOf(state.mode) < 0) state.mode = 'method';
    setMode(state.mode);
    syncGoalUi();
    syncFilterChips();
    sortRows();
    syncSortUi();
    applyFilters();

    var cap = new URLSearchParams(window.location.search).get('cap');
    if (cap) {
      var target = document.getElementById('cap-' + cap) || document.querySelector('.method-row[data-id="' + cap + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();

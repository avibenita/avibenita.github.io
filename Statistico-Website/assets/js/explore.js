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
    mode: 'goal',
    query: '',
    goal: '',
    family: '',
    product: '',
    outcome: '',
    groups: '',
    design: ''
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

  function cardHaystack(card) {
    if (card._hay) return card._hay;
    card._hay = normalize([
      card.getAttribute('data-id'),
      card.getAttribute('data-parent'),
      card.getAttribute('data-keywords'),
      card.getAttribute('data-tags'),
      card.getAttribute('data-goals'),
      card.querySelector('h3') && card.querySelector('h3').textContent,
      card.querySelector('.cap-blurb') && card.querySelector('.cap-blurb').textContent
    ].join(' '));
    return card._hay;
  }

  function scoreCard(card, tokens) {
    if (!tokens.length) return 1;
    var hay = cardHaystack(card);
    var title = normalize((card.querySelector('h3') || {}).textContent || '');
    var hits = 0;
    tokens.forEach(function (token) {
      if (title === token || title.indexOf(token) >= 0) hits += 3;
      else if (hay.indexOf(token) >= 0) hits += 1;
    });
    return hits / tokens.length;
  }

  function highlightTags(card, tokens) {
    card.querySelectorAll('.cap-tags li').forEach(function (tag) {
      var text = normalize(tag.textContent);
      var match = tokens.some(function (token) { return text.indexOf(token) >= 0; });
      tag.classList.toggle('is-match', match);
    });
  }

  function applyFilters() {
    var cards = readCards();
    var expanded = expandQuery(state.query);
    var tokens = tokensOf(expanded);
    var shown = 0;

    cards.forEach(function (card) {
      var ok = true;
      if (state.goal && (card.getAttribute('data-goals') || '').indexOf(state.goal) < 0) ok = false;
      if (state.family && card.getAttribute('data-family') !== state.family) ok = false;
      if (state.product && card.getAttribute('data-product') !== state.product) ok = false;
      if (state.outcome) {
        var outcomes = (card.getAttribute('data-outcome') || '').split(/\s+/);
        if (outcomes.indexOf(state.outcome) < 0) ok = false;
      }
      if (state.groups) {
        var groups = (card.getAttribute('data-groups') || '').split(/\s+/);
        if (groups.indexOf(state.groups) < 0) ok = false;
      }
      if (state.design) {
        var designs = (card.getAttribute('data-design') || '').split(/\s+/);
        if (designs.indexOf(state.design) < 0) ok = false;
      }

      var score = ok ? scoreCard(card, tokens) : 0;
      var visible = ok && score > 0;
      card.hidden = !visible;
      card.classList.toggle('is-hit', visible && tokens.length > 0 && score >= 1);
      highlightTags(card, visible ? tokens : []);
      if (visible) shown += 1;
    });

    document.querySelectorAll('.family-block').forEach(function (block) {
      var any = block.querySelector('.cap-card:not([hidden])');
      block.hidden = !any;
    });

    if (els.count) {
      els.count.textContent = shown === 1 ? '1 capability' : shown + ' capabilities';
    }
    if (els.empty) {
      els.empty.classList.toggle('is-visible', shown === 0);
    }
    if (els.clearBtn) {
      els.clearBtn.classList.toggle('is-visible', Boolean(state.query));
    }
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.mode && state.mode !== 'goal') params.set('mode', state.mode);
    if (state.query) params.set('q', state.query);
    if (state.goal) params.set('goal', state.goal);
    if (state.family) params.set('family', state.family);
    if (state.product) params.set('product', state.product);
    if (state.outcome) params.set('outcome', state.outcome);
    if (state.groups) params.set('groups', state.groups);
    if (state.design) params.set('design', state.design);
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
    if (mode !== 'goal') {
      state.goal = '';
      state.outcome = '';
      state.groups = '';
      state.design = '';
      syncGoalUi();
    }
    if (mode !== 'method') state.family = '';
    if (mode !== 'product') state.product = '';
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

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    state.mode = params.get('mode') || 'goal';
    state.query = params.get('q') || '';
    state.goal = params.get('goal') || '';
    state.family = params.get('family') || '';
    state.product = params.get('product') || '';
    state.outcome = params.get('outcome') || '';
    state.groups = params.get('groups') || '';
    state.design = params.get('design') || '';
    if (els.input) els.input.value = state.query;
  }

  function bind() {
    els.input = document.getElementById('explore-q');
    els.clearBtn = document.getElementById('explore-clear');
    els.count = document.getElementById('explore-count');
    els.empty = document.getElementById('explore-empty');
    els.navigator = document.getElementById('compare-navigator');

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
    if (['goal', 'method', 'product'].indexOf(state.mode) < 0) state.mode = 'goal';
    setMode(state.mode);
    syncGoalUi();
    syncFilterChips();
    applyFilters();

    var cap = new URLSearchParams(window.location.search).get('cap');
    if (cap) {
      var target = document.getElementById('cap-' + cap);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();

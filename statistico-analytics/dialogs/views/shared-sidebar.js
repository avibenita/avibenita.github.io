/**
 * shared-sidebar.js  – v2026-0307b
 *
 * Injects a collapsible vertical sidebar into any Statistico results dialog,
 * replicating EXACTLY the layout used in regression-coefficients.html:
 *
 *   body  (flex-column)
 *    ├── #header-container   (shared header, if present)
 *    └── div.wrap  (flex-row, flex:1)
 *          └── section.card  (flex-row, flex:1)
 *                ├── nav.sb-nav              ← sidebar
 *                └── div.card-main           ← content column
 *                      ├── [hero-section]    ← optional toolbar (if present)
 *                      └── div.card-body     ← scrollable area (flex:1)
 *                            └── div.tab-content  ← one per tab
 *
 * Usage:
 *   <link rel="stylesheet" href="../shared-sidebar.css?v=2026-0307b">
 *   <script src="../shared-sidebar.js?v=2026-0307b"></script>
 *
 *   StatisticoSidebar.init({
 *     module:     'Correlations',
 *     moduleName: 'correlation',
 *     groups: [
 *       { title: 'Correlations', tabs: [
 *         { tab: 'matrix',  label: 'Matrix',  icon: 'fa-table-cells' },
 *       ]},
 *     ],
 *     firstTab:    'matrix',
 *     onTabSwitch: (tab) => {},
 *   });
 */

(function () {
  'use strict';

  /* ── Icon defaults ────────────────────────────────────────────────────── */
  const ICON_MAP = {
    explore:             'fa-chart-column',
    trajectories:        'fa-chart-line',
    assumptions:         'fa-shield-halved',
    results:             'fa-table-cells',
    overview:            'fa-table-cells',
    matrix:              'fa-table-cells',
    posthoc:             'fa-table-cells-large',
    effects:             'fa-wave-square',
    power:               'fa-bolt',
    report:              'fa-file-lines',
    'ai-interpretation': 'fa-brain',
    ai:                  'fa-brain',
    predictions:         'fa-wand-magic-sparkles',
    correlations:        'fa-project-diagram',
    network:             'fa-project-diagram',
    partial:             'fa-circle-half-stroke',
    reliability:         'fa-shield-halved',
    descriptive:         'fa-chart-bar',
    descriptives:        'fa-chart-bar',
    residuals:           'fa-gauge-high',
    'res-plots':         'fa-chart-line',
    'res-influential':   'fa-triangle-exclamation',
    suitability:         'fa-circle-check',
    extraction:          'fa-magnifying-glass-chart',
    rotation:            'fa-arrows-rotate',
    diagnostics:         'fa-stethoscope',
    scores:              'fa-chart-scatter',
    roc:                 'fa-chart-area',
    summary:             'fa-chart-bar',
    forest:              'fa-chart-simple',
    heterogeneity:       'fa-chart-scatter',
    bias:                'fa-triangle-exclamation',
    studies:             'fa-table',
    ancova:              'fa-layer-group',
    coefficients:        'fa-superscript',
    default:             'fa-circle-dot',
  };

  function icon(tab) { return ICON_MAP[tab] || ICON_MAP.default; }
  function esc(s)    { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.StatisticoSidebar = {
    _cfg:       null,
    _activeTab: null,

    init(cfg = {}) {
      this._cfg = cfg;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._build());
      } else {
        this._build();
      }
    },

    /* ── Core build ──────────────────────────────────────────────────── */
    _build() {
      const cfg = this._cfg;

      /* 1 ── Enforce full-viewport body layout ────────────────────────── */
      Object.assign(document.documentElement.style, {
        height: '100%', overflow: 'hidden',
      });
      Object.assign(document.body.style, {
        height: '100%', margin: '0', padding: '0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      });

      /* 2 ── Determine first (active) tab ────────────────────────────── */
      const allTabIds = cfg.groups
        ? cfg.groups.flatMap(g => g.tabs.map(t => typeof t === 'string' ? t : t.tab))
        : [];
      const firstTabName = cfg.firstTab || allTabIds[0]
        || document.querySelector('[id^="tab-"]')?.id.replace('tab-', '')
        || null;
      this._activeTab = firstTabName;

      /* 3 ── If the page already has a correctly-structured wrap+card,
              just inject the sidebar and return ─────────────────────── */
      const existingCard = document.querySelector('.wrap > .card, .wrap > section.card');
      const existingWrap = document.querySelector('.wrap');

      if (existingWrap && existingCard) {
        // Regression-style page — just inject sidebar
        this._injectSidebar(existingCard, cfg, firstTabName);
        this._normaliseTabPanels(firstTabName);
        this._hideOldNavBars();
        this._patchSwitchTab();
        this._syncDecimalSelect();
        if (cfg.moduleName) this._loadSavedModels();
        console.log(`[StatisticoSidebar v2026-0307b] injected into existing wrap for "${cfg.module}"`);
        return;
      }

      /* 4 ── Pages without wrap/card: restructure the DOM ────────────── */

      // 4a. Find (or create) header mount — keep it pinned at top of body
      let headerMount = document.getElementById('header-container');
      if (!headerMount) {
        // Check for an existing page-specific header to keep at top
        headerMount = null; // no action — the page's own header stays in body
      }

      // 4b. Collect ALL tab panels from anywhere in the document
      const tabPanels = Array.from(document.querySelectorAll('[id^="tab-"]'))
        .filter(el => !el.closest('.sb-nav'));

      // 4c. Collect the page's "toolbar / hero" if present (settings bar, hero-section, etc.)
      const heroEl = document.querySelector('.hero-section, .settings-bar, .dashboard-actions');

      // 4d. Build wrap > card > card-main > card-body
      const wrap     = document.createElement('div');
      const card     = document.createElement('section');
      const cardMain = document.createElement('div');
      const cardBody = document.createElement('div');

      wrap.className     = 'wrap';
      card.className     = 'card';
      cardMain.className = 'card-main';
      cardBody.className = 'card-body';

      Object.assign(wrap.style, {
        flex: '1', minHeight: '0', display: 'flex',
        flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden',
      });

      // Move ALL body children (except headerMount) into cardBody
      // We'll keep loading overlays and modals outside the card-body
      const toMove = Array.from(document.body.children).filter(el => {
        if (el === headerMount) return false;
        // fixed/absolute overlays (modals, loading overlays) go INSIDE wrap (after card) so they still work
        return true;
      });

      // First pass: move tab-related content into cardBody, everything else into cardMain
      // We build the DOM tree, then append to body

      // Move non-tab elements that are the "page shell" (containers, wrappers, old nav bars)
      toMove.forEach(el => {
        const isTabPanel = el.id && el.id.startsWith('tab-');
        const isModal    = el.style?.position === 'fixed'
                        || el.classList.contains('modal')
                        || el.classList.contains('scatter-modal')
                        || el.classList.contains('loading-overlay');
        if (isModal) {
          // keep modals/overlays at body level (they use position:fixed)
          return;
        }
        cardBody.appendChild(el);
      });

      cardMain.appendChild(cardBody);
      card.appendChild(cardMain);
      wrap.appendChild(card);

      // Re-insert: header first, then wrap, then fixed overlays remain in body
      if (headerMount) {
        document.body.insertBefore(wrap, headerMount.nextSibling);
      } else {
        document.body.appendChild(wrap);
      }

      // 4e. Inject sidebar into card (before card-main)
      this._injectSidebar(card, cfg, firstTabName);
      this._normaliseTabPanels(firstTabName);
      this._hideOldNavBars();
      this._patchSwitchTab();
      this._syncDecimalSelect();
      if (cfg.moduleName) this._loadSavedModels();
      console.log(`[StatisticoSidebar v2026-0307b] restructured DOM for "${cfg.module}"`);
    },

    /* ── Inject sidebar nav into a .card element ──────────────────────── */
    _injectSidebar(card, cfg, firstTabName) {
      // Remove any stale sidebar
      card.querySelector('.sb-nav')?.remove();

      const nav = document.createElement('nav');
      nav.className = 'sb-nav';
      nav.id        = 'sidebarNav';
      nav.innerHTML = this._buildNavHTML(cfg, firstTabName);

      // Sidebar is FIRST child of card (left column)
      card.insertBefore(nav, card.firstChild);

      // Ensure card-main wraps everything else
      let cardMain = card.querySelector(':scope > .card-main');
      if (!cardMain) {
        cardMain = document.createElement('div');
        cardMain.className = 'card-main';
        Array.from(card.children).forEach(el => {
          if (!el.classList.contains('sb-nav')) cardMain.appendChild(el);
        });
        card.appendChild(cardMain);
      }

      // Ensure card-body wraps the tab panels (but NOT hero-section / settings-bar)
      let cardBody = cardMain.querySelector(':scope > .card-body');
      if (!cardBody) {
        cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        const tabPanels = Array.from(cardMain.children).filter(el =>
          !el.classList.contains('hero-section') &&
          !el.classList.contains('settings-bar') &&
          !el.classList.contains('card-body')
        );
        tabPanels.forEach(el => cardBody.appendChild(el));
        cardMain.appendChild(cardBody);
      }
    },

    /* ── Normalise all tab panels ─────────────────────────────────────── */
    _normaliseTabPanels(firstTabName) {
      document.querySelectorAll('[id^="tab-"]').forEach(p => {
        if (p.closest('.sb-nav')) return;
        const t        = p.id.replace('tab-', '');
        const isActive = t === firstTabName;
        p.classList.add('tab-content');
        p.classList.remove('tab-panel');
        p.classList.toggle('active', isActive);
        // Remove inline display so CSS !important takes over
        p.style.removeProperty('display');
      });
    },

    /* ── Hide old horizontal nav bars ───────────────────────────────────*/
    _hideOldNavBars() {
      document.querySelectorAll(
        '.tab-navigation, .tabs-container, .tab-buttons, .tabs, .tab-row, ' +
        '.dashboard-actions, .header-tabs, .nav-tabs, .tab-bar'
      ).forEach(el => {
        if (!el.closest('.sb-nav')) el.style.display = 'none';
      });
    },

    /* ── Patch / replace window.switchTab ──────────────────────────── */
    _patchSwitchTab() {
      const orig = window.switchTab;
      const self = this;
      window.switchTab = function (tab) {
        if (typeof orig === 'function') {
          try { orig(tab); } catch(e) { /* ignore errors from page-specific event handling */ }
        }
        self._applySwitch(tab);
      };
    },

    /* ── Sync decimal selects ──────────────────────────────────────── */
    _syncDecimalSelect() {
      const existingDec = document.getElementById('decimalSelect');
      const sbDec       = document.getElementById('decimalSelectSb');
      if (existingDec && sbDec) {
        sbDec.value = existingDec.value;
        existingDec.addEventListener('change', () => { sbDec.value = existingDec.value; });
      }
    },

    /* ── Build sidebar HTML ─────────────────────────────────────────────── */
    _buildNavHTML(cfg, activeTab) {
      const groups = cfg.groups || [];
      const groupsHtml = groups.map(g => {
        const itemsHtml = g.tabs.map(t => {
          const tab   = typeof t === 'string' ? t : t.tab;
          const label = typeof t === 'string' ? tab : (t.label || tab);
          const ico   = t.icon || icon(tab || 'default');
          const href  = t.href || null;   // cross-page navigation
          const active  = tab && tab === activeTab ? ' active' : '';
          const subCls  = t.sub ? ' sb-item-sub' : '';

          if (href) {
            // Cross-page nav: navigate like the header does
            return `
              <button class="sb-item${subCls}" data-href="${esc(href)}"
                      onclick="StatisticoSidebar._navigate('${esc(href)}')">
                <i class="fa-solid ${ico} sb-item-icon"></i>
                <span class="sb-item-label">${esc(label)}</span>
              </button>`;
          }
          return `
            <button class="sb-item${active}${subCls}" data-tab="${esc(tab)}"
                    onclick="StatisticoSidebar._click('${esc(tab)}')">
              <i class="fa-solid ${ico} sb-item-icon"></i>
              <span class="sb-item-label">${esc(label)}</span>
            </button>`;
        }).join('');
        return `
          <div class="sb-group">
            <div class="sb-group-title">${esc(g.title)}</div>
            ${itemsHtml}
          </div>`;
      }).join('');

      const hasSaved = false; // Saved models belong in taskpane, not sidebar

      const savedHtml = '';

      return `
        <div class="sb-header">
          <i class="fa-solid fa-bars-staggered sb-menu-icon"></i>
          <span class="sb-menu-title">Menu</span>
          <button class="sb-toggle-btn" onclick="StatisticoSidebar.toggle()" title="Collapse / expand">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
        </div>
        <div class="sb-body">
          ${groupsHtml}
        </div>
        <div class="sb-bottom">
          ${savedHtml}
          <div class="sb-bottom-row">
            <i class="fa-solid fa-hashtag sb-bottom-icon"></i>
            <span class="sb-bottom-label">Decimals</span>
            <select id="decimalSelectSb" class="sb-bottom-select"
                    onchange="StatisticoSidebar._onDecimal(this.value)">
              <option value="auto">Auto</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>`;
    },

    /* ── Tab switch ────────────────────────────────────────────────────── */
    _click(tab) {
      window.switchTab(tab);
    },

    /* ── Cross-page navigation ─────────────────────────────────────────── */
    _navigate(href) {
      if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.navigateTo) {
        StatisticoHeader.navigateTo(href);
      } else {
        // Persist data and navigate
        if (window.correlationData) {
          try { sessionStorage.setItem('correlationData', JSON.stringify(window.correlationData)); } catch(e) {}
        }
        // Resolve URL relative to dialogs/views/
        const { origin, pathname } = window.location;
        const marker = '/dialogs/views/';
        const idx = pathname.indexOf(marker);
        if (idx !== -1) {
          window.location.href = `${origin}${pathname.slice(0, idx)}${marker}${href}`;
        } else {
          window.location.href = `./${href.split('/').pop()}`;
        }
      }
    },

    _applySwitch(tab) {
      this._activeTab = tab;
      // Sidebar active state
      document.querySelectorAll('#sidebarNav .sb-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      // Panel visibility — CSS !important handles display; just manage .active
      document.querySelectorAll('.tab-content, .tab-panel').forEach(p => {
        if (!p.id || !p.id.startsWith('tab-')) return;
        if (p.closest('.sb-nav')) return;
        const isActive = p.id === 'tab-' + tab;
        p.classList.toggle('active', isActive);
        p.style.removeProperty('display');
      });
      // Scroll to top
      const body = document.querySelector('.card-body');
      if (body) body.scrollTop = 0;
    },

    /* ── Collapse toggle ───────────────────────────────────────────────── */
    toggle() {
      document.getElementById('sidebarNav')?.classList.toggle('collapsed');
    },

    /* ── Decimal sync ─────────────────────────────────────────────────── */
    _onDecimal(val) {
      const el = document.getElementById('decimalSelect');
      if (el && el.value !== val) { el.value = val; el.dispatchEvent(new Event('change')); }
    },

    /* ── Saved models ──────────────────────────────────────────────────── */
    _toggleSavedPanel() {
      const panel = document.getElementById('sbSavedPanel');
      const caret = document.getElementById('sbSavedCaret');
      if (!panel) return;
      const open = panel.style.display === 'none';
      panel.style.display = open ? 'block' : 'none';
      if (caret) caret.style.transform = open ? 'rotate(180deg)' : '';
      if (open) this._loadSavedModels();
    },

    async _loadSavedModels() {
      const list = document.getElementById('sbSavedList');
      if (!list) return;
      list.innerHTML = '<div class="sb-saved-empty">Loading…</div>';
      try {
        const mgr = window.SavedAnalysesManager || window.savedAnalysesManager;
        const analyses = mgr?.getAnalysesByModule
          ? await mgr.getAnalysesByModule(this._cfg.moduleName) : [];
        if (!analyses?.length) {
          list.innerHTML = '<div class="sb-saved-empty">No saved models yet.</div>';
          return;
        }
        list.innerHTML = analyses.map(a => `
          <div class="sb-saved-item" onclick="StatisticoSidebar._loadModel('${esc(a.id)}')">
            <i class="fa-solid fa-chart-line" style="opacity:.6;font-size:11px;flex-shrink:0;"></i>
            <span class="sb-saved-name">${esc(a.name || a.id)}</span>
            ${a.starred ? '<i class="fa-solid fa-star" style="color:#f59e0b;font-size:10px;flex-shrink:0;"></i>' : ''}
          </div>`).join('');
      } catch (e) {
        list.innerHTML = '<div class="sb-saved-empty">Unable to load.</div>';
      }
    },

    _loadModel(id) {
      if (typeof this._cfg?.onLoadModel === 'function') this._cfg.onLoadModel(id);
    },
  };

})();

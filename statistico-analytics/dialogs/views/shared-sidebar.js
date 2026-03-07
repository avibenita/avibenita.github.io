/**
 * shared-sidebar.js  – v2026-0307
 *
 * Auto-injects a collapsible vertical sidebar into any Statistico results dialog.
 * Replaces horizontal .tab-navigation / .tab-button bars.
 *
 * Usage (add to <head> AFTER shared-sidebar.css):
 *   <script src="../shared-sidebar.js?v=2026-0307"></script>
 *
 * Then call (after DOM ready, or after data received):
 *   StatisticoSidebar.init({
 *     module:      'Regression',          // subtitle shown in header
 *     groups:      [                      // optional: override grouping
 *       { title: 'Model',   tabs: ['results','predictions'] },
 *       { title: 'Diagnostics', tabs: ['residuals','res-plots'] },
 *     ],
 *     onTabSwitch: (tabName) => {},       // called after sidebar switches tab
 *     getData:     () => ({ headers, rows, columnRoles, usedMask }),
 *                                         // returns data for obs-toggle panel
 *     saveModel:   () => {},              // optional save callback
 *     moduleName:  'regression',          // for saved-analyses lookup
 *   });
 *
 * If `groups` is omitted, tabs are auto-detected from .tab-button[data-tab] elements
 * and placed in a single group.
 *
 * The script:
 *  1. Detects existing .tab-navigation / .tab-button elements
 *  2. Hides .tab-navigation (adds .sb-replaced class)
 *  3. Injects <nav class="sb-nav"> as the first child of .card (or .wrap)
 *  4. Wraps remaining .card children in .sb-content if needed
 *  5. Wires all clicks + patches existing switchTab()
 *  6. Adds "Used Obs" toggle in sidebar bottom (if getData provided)
 *  7. Adds "Saved Models" dropdown in sidebar bottom (if moduleName provided)
 */

(function () {
  'use strict';

  // ─── Icon map: data-tab → FA icon class ──────────────────────────────────
  const ICON_MAP = {
    explore:          'fa-chart-column',
    trajectories:     'fa-chart-line',
    assumptions:      'fa-shield-halved',
    results:          'fa-table-cells',
    overview:         'fa-table-cells',
    posthoc:          'fa-table-cells-large',
    effects:          'fa-wave-square',
    power:            'fa-bolt',
    report:           'fa-file-lines',
    'ai-interpretation': 'fa-brain',
    ai:               'fa-brain',
    predictions:      'fa-wand-magic-sparkles',
    correlations:     'fa-project-diagram',
    descriptive:      'fa-chart-bar',
    descriptives:     'fa-chart-bar',
    residuals:        'fa-gauge-high',
    'res-plots':      'fa-chart-line',
    'res-influential':'fa-triangle-exclamation',
    'res-ai':         'fa-robot',
    suitability:      'fa-circle-check',
    extraction:       'fa-magnifying-glass-chart',
    rotation:         'fa-arrows-rotate',
    diagnostics:      'fa-stethoscope',
    scores:           'fa-chart-scatter',
    roc:              'fa-chart-area',
    ancova:           'fa-layer-group',
    default:          'fa-circle-dot',
  };

  function getIcon(tabName) {
    return ICON_MAP[tabName] || ICON_MAP.default;
  }

  // ─── Public API ──────────────────────────────────────────────────────────
  window.StatisticoSidebar = {
    _cfg: null,
    _obsMode: 'used',   // 'used' | 'all'
    _savedAnalyses: [],

    /**
     * Main entry point.
     */
    init(cfg = {}) {
      this._cfg = cfg;

      // Wait for DOM if needed
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._build());
      } else {
        this._build();
      }
    },

    _build() {
      const cfg = this._cfg;

      // ── 1. Find / hide the old horizontal tab-navigation ─────────────────
      const oldNav = document.querySelector('.tab-navigation');
      if (oldNav) {
        oldNav.classList.add('sb-replaced');
        oldNav.style.display = 'none';
      }

      // ── 2. Collect tabs from existing tab-button elements ─────────────────
      const tabBtns = Array.from(
        document.querySelectorAll('.tab-button[data-tab], .tab-btn[data-tab]')
      );

      // Determine groups
      let groups = cfg.groups || null;
      if (!groups) {
        // Auto-group: place all tabs into a single group
        const tabs = tabBtns.map(b => ({
          tab:   b.dataset.tab,
          label: b.querySelector('span')?.textContent?.trim()
                 || b.textContent.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim()
                 || b.dataset.tab,
        }));
        // Trim emoji / icon text
        tabs.forEach(t => { t.label = t.label.replace(/fa-.*/,'').trim() || t.tab; });
        groups = [{ title: cfg.module || 'Navigation', tabs }];
      } else {
        // User-supplied groups: resolve tab labels from DOM
        groups = groups.map(g => ({
          title: g.title,
          tabs: g.tabs.map(t => {
            if (typeof t === 'string') {
              const btn = tabBtns.find(b => b.dataset.tab === t);
              const rawLabel = btn
                ? (btn.querySelector('span')?.textContent?.trim() || btn.textContent.trim())
                : t;
              return { tab: t, label: _cleanLabel(rawLabel) };
            }
            return t; // already { tab, label }
          }),
          sub: g.sub || false,
        }));
      }

      // ── 3. Build sidebar HTML ─────────────────────────────────────────────
      const nav = document.createElement('nav');
      nav.className = 'sb-nav';
      nav.id = 'sidebarNav';

      const moduleTitle = cfg.module || document.title.split('–')[0].trim() || 'Menu';

      nav.innerHTML = `
        <!-- Header -->
        <div class="sb-header">
          <i class="fa-solid fa-bars-staggered sb-menu-icon"></i>
          <span class="sb-menu-title">Menu</span>
          <button class="sb-toggle-btn" onclick="StatisticoSidebar.toggle()" title="Collapse / expand">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
        </div>

        <!-- Nav body -->
        <div class="sb-body" id="sbNavBody">
          ${groups.map(g => `
            <div class="sb-group">
              <div class="sb-group-title">${_esc(g.title)}</div>
              ${g.tabs.map((t, i) => {
                const tab   = typeof t === 'string' ? t : t.tab;
                const label = typeof t === 'string' ? tab : t.label;
                const sub   = (g.sub || (t.sub)) ? ' sb-item-sub' : '';
                const icon  = t.icon || getIcon(tab);
                const active = (i === 0 && g === groups[0]) ? ' active' : '';
                return `
                  <button class="sb-item${sub}${active}" data-tab="${_esc(tab)}"
                          onclick="StatisticoSidebar._click('${_esc(tab)}')">
                    <i class="fa-solid ${icon} sb-item-icon"></i>
                    <span class="sb-item-label">${_esc(label)}</span>
                  </button>`;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <!-- Bottom footer -->
        <div class="sb-bottom" id="sbBottom">
          ${cfg.getData ? `
          <!-- Obs filter -->
          <div class="sb-bottom-section" id="sbObsSection">
            <div class="sb-bottom-label sb-obs-label">
              <i class="fa-solid fa-filter sb-bottom-icon"></i>
              <span>Observations</span>
            </div>
            <div class="sb-obs-pills">
              <button class="sb-obs-pill active" id="sbPillUsed"
                      onclick="StatisticoSidebar._setObs('used')">
                <i class="fa-solid fa-check-circle"></i>
                <span class="sb-item-label">Used only</span>
              </button>
              <button class="sb-obs-pill" id="sbPillAll"
                      onclick="StatisticoSidebar._setObs('all')">
                <i class="fa-solid fa-table-list"></i>
                <span class="sb-item-label">All rows</span>
              </button>
            </div>
          </div>
          ` : ''}

          ${cfg.moduleName ? `
          <!-- Saved Models -->
          <div class="sb-bottom-section" id="sbSavedSection">
            <button class="sb-bottom-btn" onclick="StatisticoSidebar._toggleSavedPanel()" id="sbSavedBtn">
              <i class="fa-solid fa-bookmark sb-bottom-icon"></i>
              <span class="sb-item-label">Saved Models</span>
              <i class="fa-solid fa-chevron-down sb-saved-caret" id="sbSavedCaret"
                 style="margin-left:auto;font-size:9px;opacity:.5;"></i>
            </button>
            <div class="sb-saved-panel" id="sbSavedPanel" style="display:none;">
              <div class="sb-saved-list" id="sbSavedList">
                <div class="sb-saved-empty">Loading…</div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Decimals -->
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

        </div><!-- /sb-bottom -->
      `;

      // ── 4. Inject into page ───────────────────────────────────────────────
      // Wrap the card's non-nav children in .sb-content if not already done
      const card = document.querySelector('.card') || document.querySelector('.wrap');
      if (card) {
        // Ensure card is flex-row
        card.style.display    = 'flex';
        card.style.flexDirection = 'row';
        card.style.alignItems = 'stretch';
        card.style.height     = '100%';
        card.style.overflow   = 'hidden';

        // Wrap existing children into .sb-content
        if (!card.querySelector('.sb-content')) {
          const content = document.createElement('div');
          content.className = 'sb-content';
          while (card.firstChild) content.appendChild(card.firstChild);
          card.appendChild(content);
        }

        card.insertBefore(nav, card.firstChild);
      } else {
        document.body.insertBefore(nav, document.body.firstChild);
      }

      // ── 5. Patch page's existing switchTab() ─────────────────────────────
      const originalSwitchTab = window.switchTab;
      window.switchTab = (tab) => {
        if (typeof originalSwitchTab === 'function') originalSwitchTab(tab);
        StatisticoSidebar._syncActive(tab);
      };

      // Wire up any old tab-button click listeners via data-tab
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          StatisticoSidebar._syncActive(btn.dataset.tab);
        });
      });

      // ── 6. Sync decimal select with existing #decimalSelect ───────────────
      const existingDecimalSel = document.getElementById('decimalSelect');
      const sbDecimalSel       = document.getElementById('decimalSelectSb');
      if (existingDecimalSel && sbDecimalSel) {
        sbDecimalSel.value = existingDecimalSel.value;
        existingDecimalSel.addEventListener('change', () => {
          sbDecimalSel.value = existingDecimalSel.value;
        });
      }

      // ── 7. Load saved models ──────────────────────────────────────────────
      if (cfg.moduleName) {
        this._loadSavedModels();
      }

      console.log(`[StatisticoSidebar] Initialized for module: ${moduleTitle}`);
    },

    // ── Toggle collapse ───────────────────────────────────────────────────
    toggle() {
      const nav = document.getElementById('sidebarNav');
      if (nav) nav.classList.toggle('collapsed');
    },

    // ── Sidebar item click ────────────────────────────────────────────────
    _click(tab) {
      // Call existing page switchTab if it exists
      if (typeof window.switchTab === 'function') {
        window.switchTab(tab);
      } else {
        // Fallback: manual tab switching
        document.querySelectorAll('.tab-panel, .tab-content').forEach(p => {
          p.classList.toggle('active', p.id === 'tab-' + tab);
        });
        document.querySelectorAll('.tab-button[data-tab], .tab-btn[data-tab]').forEach(b => {
          b.classList.toggle('active', b.dataset.tab === tab);
        });
      }
      this._syncActive(tab);
    },

    // ── Sync active state on sidebar items ───────────────────────────────
    _syncActive(tab) {
      document.querySelectorAll('#sidebarNav .sb-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
    },

    // ── Observations toggle ───────────────────────────────────────────────
    _setObs(mode) {
      this._obsMode = mode;
      document.getElementById('sbPillUsed')?.classList.toggle('active', mode === 'used');
      document.getElementById('sbPillAll')?.classList.toggle('active',  mode === 'all');

      // Notify page via callback
      if (typeof this._cfg?.onObsChange === 'function') {
        this._cfg.onObsChange(mode);
      }
      // Also fire a custom DOM event so pages can listen
      document.dispatchEvent(new CustomEvent('sb:obsChange', { detail: { mode } }));
    },

    // ── Decimal sync ─────────────────────────────────────────────────────
    _onDecimal(val) {
      // Sync to page's existing decimalSelect
      const existing = document.getElementById('decimalSelect');
      if (existing && existing.value !== val) {
        existing.value = val;
        existing.dispatchEvent(new Event('change'));
      }
    },

    // ── Saved Models panel ────────────────────────────────────────────────
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
        let analyses = [];
        // Try using SavedAnalysesManager if available
        if (window.SavedAnalysesManager && typeof window.SavedAnalysesManager.getAnalysesByModule === 'function') {
          analyses = await window.SavedAnalysesManager.getAnalysesByModule(this._cfg.moduleName);
        } else if (window.savedAnalysesManager && typeof window.savedAnalysesManager.getAnalysesByModule === 'function') {
          analyses = await window.savedAnalysesManager.getAnalysesByModule(this._cfg.moduleName);
        }

        if (!analyses || analyses.length === 0) {
          list.innerHTML = '<div class="sb-saved-empty">No saved models yet.</div>';
          return;
        }

        list.innerHTML = analyses.map(a => `
          <div class="sb-saved-item" onclick="StatisticoSidebar._loadModel('${_esc(a.id)}')">
            <i class="fa-solid fa-chart-line" style="opacity:.6;font-size:11px;flex-shrink:0;"></i>
            <span class="sb-saved-name">${_esc(a.name || a.id)}</span>
            ${a.starred ? '<i class="fa-solid fa-star" style="color:#f59e0b;font-size:10px;flex-shrink:0;"></i>' : ''}
          </div>
        `).join('');
      } catch (e) {
        list.innerHTML = '<div class="sb-saved-empty">Unable to load models.</div>';
        console.warn('[StatisticoSidebar] Could not load saved analyses:', e);
      }
    },

    _loadModel(id) {
      if (typeof this._cfg?.onLoadModel === 'function') {
        this._cfg.onLoadModel(id);
      }
    },
  };

  // ─── Helpers ────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _cleanLabel(s) {
    // Remove font-awesome class text, leading icons, trim
    return s.replace(/fa-[a-z-]+/g,'').replace(/\s+/g,' ').trim();
  }

})();

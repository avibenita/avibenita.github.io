/* ═══════════════════════════════════════════════════════════════════════════
   shared tooltip bootstrap
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function resolveAssetUrl(relPath) {
    const { origin, pathname } = window.location;
    if (pathname.includes('/dialogs/views/')) {
      return `${origin}${pathname.split('/dialogs/views/')[0]}/${relPath}`;
    }
    if (pathname.includes('/taskpane/')) {
      return `${origin}${pathname.split('/taskpane/')[0]}/${relPath}`;
    }
    return `${origin}/${relPath}`;
  }

  function initTooltip() {
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.init === 'function') {
      window.StatisticoTooltip.init();
      window.StatisticoTooltip.refresh();
    }
  }

  function ensureTooltipScript() {
    if (window.StatisticoTooltip) {
      initTooltip();
      return;
    }
    const scriptId = 'st-tooltip-template-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = resolveAssetUrl('src/shared/js/tooltip-template.js?v=20260601p');
    script.async = true;
    script.onload = initTooltip;
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureTooltipScript);
  } else {
    ensureTooltipScript();
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   shared-config.js  –  Theme toggle + utilities for config dialogs
   VERSION: 2026-03-09-003
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'statistico-config-theme';

  // ── Apply theme to <html> and sync button visuals ──────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    const btn = document.getElementById('cfgThemeToggle');
    if (!btn) return;

    const icon  = btn.querySelector('.cfg-toggle-icon');
    const label = btn.querySelector('.cfg-toggle-label');

    if (icon)  icon.textContent  = theme === 'light' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';

    btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY) || 'light'; } catch (_) { return 'light'; }
  }

  function saveTheme(t) {
    try { localStorage.setItem(STORAGE_KEY, t); } catch (_) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  // Apply saved theme immediately (prevents flash)
  applyTheme(getSaved());

  // Re-sync once DOM is ready (so button icon reflects state)
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getSaved());
    const btn = document.getElementById('cfgThemeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    if (!document.getElementById('statistico-minimal-css')) {
      const link = document.createElement('link');
      link.id = 'statistico-minimal-css';
      link.rel = 'stylesheet';
      link.href = '../shared-minimal.css?v=20260601q';
      document.head.appendChild(link);
    }
  });

  // Expose globally
  window.CfgTheme = { toggle: toggleTheme, apply: applyTheme, get: getSaved };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   CfgSave  –  Shared save / load utilities for all config dialogs
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const SAVE_BTN_TEXT = 'Save this Configuration';
  const SAVE_BTN_TIP = 'Save this configuration';
  const SAVE_BTN_TIP_HTML =
    '<strong class="st-tt-title"><i class="fa-solid fa-floppy-disk" style="margin-right:5px;opacity:.85;"></i>Save this Configuration</strong>' +
    '<span class="st-tt-body">Stores your current setup — selected variables, method, and all options — so you can reload it instantly without re-entering anything.</span>' +
    '<span class="st-tt-hint">Saved in your browser (localStorage), not in the workbook. Will not transfer to other devices or browsers.</span>';
  const LOAD_BTN_TIP = 'Browse saved configurations';
  const LOAD_BTN_TIP_HTML =
    '<strong class="st-tt-title"><i class="fa-solid fa-folder-open" style="margin-right:5px;opacity:.85;"></i>Saved Configurations</strong>' +
    '<span class="st-tt-body">Browse and restore previously saved setups. Selecting one reloads all your variables, method, and options in one click.</span>' +
    '<span class="st-tt-hint">Only configs saved from this analysis type are shown.</span>';
  const LOAD_BTN_TEXT = (count) => count > 0 ? `Saved configs (${count})...` : 'Saved configs...';

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── localStorage helpers ─────────────────────────────────────────────── */
  function getSavedList(storageKey) {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (_) { return []; }
  }
  function putSavedList(storageKey, arr) {
    try { localStorage.setItem(storageKey, JSON.stringify(arr)); } catch (_) {}
  }

  function syncConfigButtons(storageKey) {
    if (!storageKey) return;
    const saveBtn = document.getElementById('btnSaveConfig');
    const loadBtn = document.getElementById('btnLoadPrev');
    const count = getSavedList(storageKey).length;

    if (saveBtn) {
      saveBtn.removeAttribute('title');
      saveBtn.setAttribute('aria-label', SAVE_BTN_TIP);
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> ' + SAVE_BTN_TEXT;
      saveBtn.removeAttribute('data-tip');
      saveBtn.setAttribute('data-st-tip', SAVE_BTN_TIP);
      saveBtn.setAttribute('data-st-tip-html', SAVE_BTN_TIP_HTML);
    }
    if (loadBtn) {
      loadBtn.removeAttribute('title');
      loadBtn.setAttribute('aria-label', LOAD_BTN_TIP);
      loadBtn.innerHTML = '<i class="fa-solid fa-folder-open"></i> ' + LOAD_BTN_TEXT(count);
      loadBtn.removeAttribute('data-tip');
      loadBtn.setAttribute('data-st-tip', LOAD_BTN_TIP);
      loadBtn.setAttribute('data-st-tip-html', LOAD_BTN_TIP_HTML);
      loadBtn.disabled = count === 0;
    }
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh();
    }
  }

  function detectStorageKey() {
    if (typeof window.STORAGE_KEY === 'string' && window.STORAGE_KEY) return window.STORAGE_KEY;
    const keys = Object.keys(window)
      .filter((k) => /^STORAGE_KEY_/.test(k))
      .map((k) => window[k])
      .filter((v) => typeof v === 'string' && /config/i.test(v));
    const unique = Array.from(new Set(keys));
    return unique.length === 1 ? unique[0] : null;
  }

  function autoSyncConfigButtons() {
    const key = detectStorageKey();
    if (key) syncConfigButtons(key);
  }

  /* ── Prompt dialog (replaces blocked window.prompt) ──────────────────── */
  function showCfgPrompt(title, label, defaultVal, onConfirm) {
    if (document.getElementById('cfgPromptOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'cfgPromptOverlay';
    overlay.className = 'cfg-prompt-overlay';
    overlay.innerHTML =
      '<div class="cfg-prompt-box">' +
        '<div class="cfg-prompt-title"><i class="fa-solid fa-floppy-disk"></i>' + escHtml(SAVE_BTN_TEXT) + '</div>' +
        '<div class="cfg-prompt-label">' + escHtml('Configuration name') + '</div>' +
        '<input class="cfg-prompt-input" id="cfgPromptInput" type="text" value="' + escHtml(defaultVal) + '" />' +
        '<div class="cfg-prompt-actions">' +
          '<button class="cfg-btn cancel" id="cfgPromptCancel"><i class="fa-solid fa-times"></i> Cancel</button>' +
          '<button class="cfg-btn" id="cfgPromptOk" style="background:linear-gradient(135deg,#16a34a,#4ade80);color:#fff;border:none;">' +
            '<i class="fa-solid fa-floppy-disk"></i> Save' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh(overlay);
    }
    var input = overlay.querySelector('#cfgPromptInput');
    input.focus(); input.select();
    function confirm() {
      var val = input.value.trim();
      overlay.remove();
      if (val) onConfirm(val);
    }
    function cancel() { overlay.remove(); }
    overlay.querySelector('#cfgPromptOk').addEventListener('click', confirm);
    overlay.querySelector('#cfgPromptCancel').addEventListener('click', cancel);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  confirm();
      if (e.key === 'Escape') cancel();
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) cancel(); });
  }

  /* ── Saved-list dialog ────────────────────────────────────────────────── */
  function showCfgSavedList(storageKey, buildMeta, onLoad) {
    if (document.getElementById('cfgSavedOverlay')) return;
    var saved = getSavedList(storageKey);
    var overlay = document.createElement('div');
    overlay.id = 'cfgSavedOverlay';
    overlay.className = 'cfg-saved-overlay';

    var listHtml = '';
    if (saved.length === 0) {
      listHtml = '<div class="cfg-saved-empty"><i class="fa-solid fa-layer-group" style="font-size:22px;opacity:.35;display:block;margin-bottom:10px;"></i>No saved configurations yet.<br>Configure and click <strong>Save configuration</strong>.</div>';
    } else {
      saved.forEach(function (item) {
        var date = '';
        try { date = new Date(item.savedAt).toLocaleString(); } catch (_) {}
        var metaStr = buildMeta ? buildMeta(item) : '';
        listHtml +=
          '<div class="cfg-saved-item" onclick="CfgSave._loadById(\'' + escHtml(storageKey) + '\',\'' + escHtml(item.id) + '\')">' +
            '<div class="cfg-saved-item-icon"><i class="fa-solid fa-layer-group"></i></div>' +
            '<div class="cfg-saved-item-body">' +
              '<div class="cfg-saved-item-name">' + escHtml(item.name) + '</div>' +
              '<div class="cfg-saved-item-meta">' + escHtml(metaStr) + (metaStr ? ' &nbsp;·&nbsp; ' : '') + escHtml(date) + '</div>' +
            '</div>' +
            '<button class="cfg-saved-item-del" onclick="CfgSave._deleteById(event,\'' + escHtml(storageKey) + '\',\'' + escHtml(item.id) + '\')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
          '</div>';
      });
    }

    overlay.innerHTML =
      '<div class="cfg-saved-modal">' +
        '<div class="cfg-saved-modal-head">' +
          '<span><i class="fa-solid fa-list-ul"></i>Saved configs</span>' +
          '<button class="cfg-saved-close" id="cfgSavedClose" title="Close">&#x2715;</button>' +
        '</div>' +
        '<div class="cfg-saved-list" id="cfgSavedList">' + listHtml + '</div>' +
        '<div class="cfg-saved-modal-foot">' +
          '<button class="cfg-btn cancel" id="cfgSavedCloseBtn"><i class="fa-solid fa-times"></i> Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.refresh === 'function') {
      window.StatisticoTooltip.refresh(overlay);
    }

    // Store the onLoad callback for use by item clicks
    CfgSave._pendingLoad[storageKey] = onLoad;
    syncConfigButtons(storageKey);

    overlay.querySelector('#cfgSavedClose').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelector('#cfgSavedCloseBtn').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  /* ── Internal helpers called from dynamic HTML ────────────────────────── */
  var _pendingLoad = {};

  function _loadById(storageKey, id) {
    var overlay = document.getElementById('cfgSavedOverlay');
    if (overlay) overlay.remove();
    var saved = getSavedList(storageKey);
    var item = saved.find(function (s) { return s.id === id; });
    if (!item) return;
    var cb = _pendingLoad[storageKey];
    if (cb) cb(item);
    syncConfigButtons(storageKey);
  }

  function _deleteById(event, storageKey, id) {
    event.stopPropagation();
    var saved = getSavedList(storageKey).filter(function (s) { return s.id !== id; });
    putSavedList(storageKey, saved);
    var overlay = document.getElementById('cfgSavedOverlay');
    if (overlay) overlay.remove();
    // Reopen with updated list (retrieve current callbacks)
    var cb = _pendingLoad[storageKey];
    // rebuild meta fn not stored – just reopen without meta (still shows names)
    showCfgSavedList(storageKey, null, cb);
    syncConfigButtons(storageKey);
  }

  /* ── Save a config entry ─────────────────────────────────────────────── */
  function saveCfgEntry(storageKey, name, spec, onDone) {
    var saved = getSavedList(storageKey);
    var entry = {
      id:      'cfg_' + Date.now(),
      name:    name.trim(),
      savedAt: new Date().toISOString(),
      spec:    spec
    };
    saved.unshift(entry);
    if (saved.length > 20) saved = saved.slice(0, 20);
    putSavedList(storageKey, saved);
    syncConfigButtons(storageKey);
    if (onDone) onDone(entry);
  }

  // Expose globally
  window.CfgSave = {
    escHtml:          escHtml,
    getSavedList:     getSavedList,
    putSavedList:     putSavedList,
    showPrompt:       showCfgPrompt,
    showSavedList:    showCfgSavedList,
    saveCfgEntry:     saveCfgEntry,
    syncConfigButtons: syncConfigButtons,
    _loadById:        _loadById,
    _deleteById:      _deleteById,
    _pendingLoad:     _pendingLoad
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      autoSyncConfigButtons();
      setTimeout(autoSyncConfigButtons, 300);
      setTimeout(autoSyncConfigButtons, 1200);
    });
  } else {
    autoSyncConfigButtons();
  }
})();

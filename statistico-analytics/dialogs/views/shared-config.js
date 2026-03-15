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
  });

  // Expose globally
  window.CfgTheme = { toggle: toggleTheme, apply: applyTheme, get: getSaved };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   CfgSave  –  Shared save / load utilities for all config dialogs
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

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

  /* ── Prompt dialog (replaces blocked window.prompt) ──────────────────── */
  function showCfgPrompt(title, label, defaultVal, onConfirm) {
    if (document.getElementById('cfgPromptOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'cfgPromptOverlay';
    overlay.className = 'cfg-prompt-overlay';
    overlay.innerHTML =
      '<div class="cfg-prompt-box">' +
        '<div class="cfg-prompt-title"><i class="fa-solid fa-floppy-disk"></i>' + escHtml(title) + '</div>' +
        '<div class="cfg-prompt-label">' + escHtml(label) + '</div>' +
        '<input class="cfg-prompt-input" id="cfgPromptInput" type="text" value="' + escHtml(defaultVal) + '" />' +
        '<div class="cfg-prompt-actions">' +
          '<button class="cfg-btn cancel" id="cfgPromptCancel"><i class="fa-solid fa-times"></i> Cancel</button>' +
          '<button class="cfg-btn" id="cfgPromptOk" style="background:linear-gradient(135deg,#16a34a,#4ade80);color:#fff;border:none;">' +
            '<i class="fa-solid fa-floppy-disk"></i> Save' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
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
          '<span><i class="fa-solid fa-list-ul"></i>Saved Configurations</span>' +
          '<button class="cfg-saved-close" id="cfgSavedClose" title="Close">&#x2715;</button>' +
        '</div>' +
        '<div class="cfg-saved-list" id="cfgSavedList">' + listHtml + '</div>' +
        '<div class="cfg-saved-modal-foot">' +
          '<button class="cfg-btn cancel" id="cfgSavedCloseBtn"><i class="fa-solid fa-times"></i> Close</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Store the onLoad callback for use by item clicks
    CfgSave._pendingLoad[storageKey] = onLoad;

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
    _loadById:        _loadById,
    _deleteById:      _deleteById,
    _pendingLoad:     _pendingLoad
  };
})();
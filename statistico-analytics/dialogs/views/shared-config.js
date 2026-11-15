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
    script.src = resolveAssetUrl('src/shared/js/tooltip-template.js?v=20260715a');
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

  function isHubDemoEmbed() {
    try {
      const p = new URLSearchParams(window.location.search || '');
      return p.get('demo') === '1' || p.get('embed') === '1';
    } catch (_) {
      return false;
    }
  }

  // ── Apply theme to <html> and sync button visuals ──────────────────────
  function applyTheme(theme) {
    if (isHubDemoEmbed()) theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (isHubDemoEmbed()) {
      document.documentElement.setAttribute('data-hub-embed', '1');
      document.documentElement.classList.add('demo-force-dark', 'demo-embed-root');
    }

    const btn = document.getElementById('cfgThemeToggle');
    if (!btn) return;

    if (isHubDemoEmbed()) {
      btn.hidden = true;
      btn.style.display = 'none';
      return;
    }

    const icon  = btn.querySelector('.cfg-toggle-icon');
    const label = btn.querySelector('.cfg-toggle-label');

    if (icon)  icon.textContent  = theme === 'light' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';

    btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }

  function getSaved() {
    if (isHubDemoEmbed()) return 'dark';
    try { return localStorage.getItem(STORAGE_KEY) || 'light'; } catch (_) { return 'light'; }
  }

  function saveTheme(t) {
    if (isHubDemoEmbed()) return;
    try { localStorage.setItem(STORAGE_KEY, t); } catch (_) {}
  }

  function toggleTheme() {
    if (isHubDemoEmbed()) return;
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  function injectSiteReturnLink() {
    if (!isHubDemoEmbed()) return;
    try { if (window.self !== window.top) return; } catch (_) {}
    if (document.getElementById('st-site-return')) return;

    if (!document.getElementById('st-site-return-style')) {
      var style = document.createElement('style');
      style.id = 'st-site-return-style';
      style.textContent =
        '.st-site-return{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;margin-right:10px;' +
        'padding:5px 11px;border-radius:999px;text-decoration:none;font-size:11px;font-weight:700;' +
        'color:#e8f6ff;border:1px solid rgba(120,200,255,.45);background:rgba(120,200,255,.16);white-space:nowrap}' +
        '.st-site-return:hover{filter:brightness(1.12);color:#fff}';
      document.head.appendChild(style);
    }

    var a = document.createElement('a');
    a.id = 'st-site-return';
    a.className = 'st-site-return';
    a.href = 'https://statistico.live/Statistico-Website/index-Addins.html';
    a.innerHTML = '← Back to Specialized Tools';
    var header = document.querySelector('.cfg-header');
    if (header) header.insertBefore(a, header.firstChild);
    else document.body.insertBefore(a, document.body.firstChild);
  }

  // Apply saved theme immediately (prevents flash)
  applyTheme(getSaved());

  // Re-sync once DOM is ready (so button icon reflects state)
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getSaved());
    injectSiteReturnLink();
    const btn = document.getElementById('cfgThemeToggle');
    if (btn && !isHubDemoEmbed()) btn.addEventListener('click', toggleTheme);
    if (!document.getElementById('statistico-minimal-css')) {
      const link = document.createElement('link');
      link.id = 'statistico-minimal-css';
      link.rel = 'stylesheet';
      link.href = '../shared-minimal.css?v=20260601s';
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

  // The rich hover tooltip must not linger under modal overlays.
  function hideTooltip() {
    if (window.StatisticoTooltip && typeof window.StatisticoTooltip.hide === 'function') {
      window.StatisticoTooltip.hide();
    }
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
    hideTooltip();
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
    hideTooltip();
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

/* ═══════════════════════════════════════════════════════════════════════════
   Input-view range picker
   The worksheet used range is the default. Select range, the current
   selection, or a named range replaces it from inside the module.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function postParent(payload) {
    try {
      if (window.Office && Office.context && Office.context.ui && typeof Office.context.ui.messageParent === 'function') {
        Office.context.ui.messageParent(JSON.stringify(payload));
        return true;
      }
    } catch (e) {}
    return false;
  }

  function setActive(root, mode) {
    if (!root) return;
    var buttons = root.querySelectorAll('[data-range-mode]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('is-active', buttons[i].getAttribute('data-range-mode') === mode);
    }
  }

  function injectStyles() {
    if (document.getElementById('cfg-input-range-style')) return;
    var style = document.createElement('style');
    style.id = 'cfg-input-range-style';
    style.textContent =
      '.cfg-input-range{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid var(--cfg-border);background:var(--cfg-surface);flex-shrink:0}' +
      '.cfg-input-range-copy{display:flex;align-items:baseline;gap:8px;min-width:0;flex-wrap:wrap}' +
      '.cfg-input-range-kicker{font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--cfg-text3)}' +
      '.cfg-input-range-addr{font-size:12px;font-weight:700;color:var(--cfg-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px}' +
      '.cfg-input-range-note{font-size:11px;color:#c2410c}' +
      '.cfg-input-range-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}' +
      '.cfg-input-range .cfg-btn-small{background:var(--cfg-surface2);border:1px solid var(--cfg-border);color:var(--cfg-text)}' +
      '.cfg-input-range .cfg-btn-small.is-active,.ps-data-actions .cfg-btn.is-active,.cfg-btn-small.is-active{box-shadow:inset 0 0 0 1px var(--cfg-run-from,#f97316);border-color:var(--cfg-run-from,#f97316)}' +
      '.cfg-input-range select{height:28px;max-width:190px;border-radius:6px;border:1px solid var(--cfg-border);background:var(--cfg-surface2);color:var(--cfg-text);font-size:11px}';
    document.head.appendChild(style);
  }

  function rowCount(body) {
    if (!body || typeof body !== 'object') return null;
    if (Array.isArray(body.rows)) return body.rows.length;
    if (Array.isArray(body.values) && body.values.length) return Math.max(0, body.values.length - 1);
    return null;
  }

  function addressFromMessage(message) {
    var bodies = [message && message.payload, message && message.data, message];
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      if (!body || typeof body !== 'object' || !body.address) continue;
      return { address: String(body.address), rows: rowCount(body) };
    }
    return null;
  }

  function ensureUsedButton() {
    if (document.getElementById('use-used') || document.getElementById('btnUseUsed')) return true;
    var anchor = document.getElementById('use-selection') || document.getElementById('btnUseSelection') ||
      document.getElementById('pick-range') || document.getElementById('btnPickRange');
    if (!anchor || !anchor.parentNode) return false;
    injectStyles();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = anchor.id.indexOf('btn') === 0 ? 'btnUseUsed' : 'use-used';
    btn.className = anchor.className;
    btn.setAttribute('data-range-mode', 'used');
    btn.title = 'Use the detected worksheet range';
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Used range';
    anchor.parentNode.insertBefore(btn, anchor);
    var selection = document.getElementById('use-selection') || document.getElementById('btnUseSelection');
    var pick = document.getElementById('pick-range') || document.getElementById('btnPickRange');
    if (selection) selection.setAttribute('data-range-mode', 'selection');
    if (pick) pick.setAttribute('data-range-mode', 'prompt');
    var group = anchor.parentNode;
    group.addEventListener('click', function (ev) {
      var target = ev.target;
      while (target && target !== group && !(target.getAttribute && target.getAttribute('data-range-mode'))) {
        target = target.parentNode;
      }
      if (!target || target === group) return;
      setActive(group, target.getAttribute('data-range-mode'));
    });
    btn.addEventListener('click', function () {
      var addr = document.getElementById('mvRangeAddr') || document.getElementById('data-note');
      if (addr) addr.textContent = 'Reading the worksheet range…';
      postParent({ action: 'useUsed' });
    });
    setActive(group, 'used');
    return true;
  }

  function wireBar(bar) {
    var addr = bar.querySelector('#cfgInputRangeAddr');
    var note = bar.querySelector('#cfgInputRangeNote');
    var named = bar.querySelector('#cfgInputNamedRange');
    var actions = bar.querySelector('.cfg-input-range-actions');

    function showNote(text) {
      if (!note) return;
      note.textContent = text || '';
    }

    actions.addEventListener('click', function (ev) {
      var target = ev.target;
      while (target && target !== actions && !(target.getAttribute && target.getAttribute('data-range-mode'))) {
        target = target.parentNode;
      }
      if (!target || target === actions) return;
      var mode = target.getAttribute('data-range-mode');
      setActive(actions, mode);
      showNote('');
      if (mode === 'named') {
        named.hidden = false;
        if (addr) addr.textContent = 'Choose a named range';
        postParent({ action: 'listNamedRanges' });
        return;
      }
      named.hidden = true;
      if (addr) addr.textContent = mode === 'prompt' ? 'Select a range in Excel…' : 'Reading the worksheet range…';
      var action = mode === 'prompt' ? 'pickRange' : (mode === 'selection' ? 'useSelection' : 'useUsed');
      if (!postParent({ action: action })) showNote('Range changes are available inside Excel.');
    });

    named.addEventListener('change', function () {
      if (!named.value) return;
      setActive(actions, 'named');
      if (addr) addr.textContent = named.value;
      showNote('');
      if (!postParent({ action: 'useNamed', name: named.value })) showNote('Range changes are available inside Excel.');
    });

    bar.__cfgRange = {
      setAddress: function (found) {
        if (!addr || !found || !found.address) return;
        addr.textContent = found.address + (found.rows != null ? (' · ' + found.rows + ' rows') : '');
        addr.title = found.address;
        showNote('');
      },
      setError: function (text) { showNote(text || 'Could not read that range.'); },
      setNames: function (names) {
        var current = named.value;
        named.innerHTML = '<option value="">— Select a named range —</option>';
        (names || []).forEach(function (name) {
          var option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          if (name === current) option.selected = true;
          named.appendChild(option);
        });
        named.hidden = false;
      }
    };
  }

  function install() {
    if (document.getElementById('cfgInputRange')) return true;
    if (document.getElementById('pick-range') || document.getElementById('btnPickRange') ||
        document.getElementById('use-selection') || document.getElementById('btnUseSelection')) {
      return ensureUsedButton();
    }
    var anchor = document.querySelector('.cfg-header') || document.querySelector('.pt2-uni-head');
    if (!anchor || !anchor.parentNode) return false;
    injectStyles();
    var bar = document.createElement('div');
    bar.id = 'cfgInputRange';
    bar.className = 'cfg-input-range';
    bar.innerHTML =
      '<div class="cfg-input-range-copy">' +
        '<span class="cfg-input-range-kicker">Data range</span>' +
        '<strong class="cfg-input-range-addr" id="cfgInputRangeAddr">Worksheet range</strong>' +
        '<span class="cfg-input-range-note" id="cfgInputRangeNote"></span>' +
      '</div>' +
      '<div class="cfg-input-range-actions">' +
        '<button type="button" class="cfg-btn-small is-active" data-range-mode="used">Used range</button>' +
        '<button type="button" class="cfg-btn-small" data-range-mode="prompt">Select range</button>' +
        '<button type="button" class="cfg-btn-small" data-range-mode="selection">Current selection</button>' +
        '<button type="button" class="cfg-btn-small" data-range-mode="named">Named range</button>' +
        '<select id="cfgInputNamedRange" hidden><option value="">— Select a named range —</option></select>' +
      '</div>';
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    wireBar(bar);
    return true;
  }

  function onParentMessage(arg) {
    var bar = document.getElementById('cfgInputRange');
    if (!bar || !bar.__cfgRange) return;
    var message;
    try { message = JSON.parse(arg && arg.message ? arg.message : '{}'); } catch (e) { return; }
    if (message.type === 'NAMED_RANGES') {
      bar.__cfgRange.setNames(message.names || []);
      return;
    }
    if (message.message && /RANGE_ERROR$/.test(message.type || '')) {
      bar.__cfgRange.setError(message.message);
      return;
    }
    var found = addressFromMessage(message);
    if (found) bar.__cfgRange.setAddress(found);
  }

  function bindMessages() {
    if (!window.Office || !Office.onReady) return;
    Office.onReady(function () {
      if (!Office.context || !Office.context.ui || typeof Office.context.ui.addHandlerAsync !== 'function') return;
      try {
        Office.context.ui.addHandlerAsync(Office.EventType.DialogParentMessageReceived, onParentMessage, function () {
          postParent({ action: 'requestData' });
        });
      } catch (e) {}
    });
  }

  function start() {
    if (!install()) return;
    bindMessages();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

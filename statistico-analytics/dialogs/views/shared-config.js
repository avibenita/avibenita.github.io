/* ═══════════════════════════════════════════════════════════════════════════
   shared-config.js  –  Theme toggle + utilities for config dialogs
   VERSION: 2026-03-09-001
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'statistico-config-theme';

  // Apply saved theme immediately (before DOM paint to avoid flash)
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Update button icon if present
    const btn = document.getElementById('cfgThemeToggle');
    if (btn) {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'light'
          ? 'fa-solid fa-moon'
          : 'fa-solid fa-sun';
      }
      btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    }
  }

  function getSaved() {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch(_) { return 'dark'; }
  }

  function saveTheme(t) {
    try { localStorage.setItem(STORAGE_KEY, t); } catch(_) {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    applyTheme(next);
  }

  // Init: apply saved theme right away
  applyTheme(getSaved());

  // Re-apply once DOM is ready (for button icon sync)
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getSaved());
    const btn = document.getElementById('cfgThemeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
  });

  // Expose globally
  window.CfgTheme = { toggle: toggleTheme, apply: applyTheme, get: getSaved };
})();

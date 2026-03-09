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

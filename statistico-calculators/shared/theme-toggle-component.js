(function () {
  "use strict";

  const STORAGE_KEY = "statistico-ui-theme";
  const STYLE_ID = "statistico-theme-toggle-styles";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .st-theme-toggle{
        display:inline-flex;
        align-items:center;
        gap:10px;
        border:1px solid rgba(255,255,255,0.18);
        border-radius:999px;
        padding:6px 10px;
        background:linear-gradient(180deg, rgba(31,50,86,0.98), rgba(20,34,61,0.96));
        color:#eaf2ff;
        font-size:.9rem;
        font-weight:700;
        line-height:1;
        cursor:pointer;
        user-select:none;
      }
      .st-theme-toggle:hover{
        border-color:rgba(143,216,255,0.45);
        background:linear-gradient(180deg, rgba(46,70,115,0.98), rgba(26,44,76,0.96));
      }
      .st-theme-icon{
        width:24px;
        height:24px;
        border-radius:50%;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,209,110,0.18);
        color:#ffd16e;
        border:1px solid rgba(255,209,110,0.38);
        flex-shrink:0;
      }
      .st-theme-switch{
        position:relative;
        width:48px;
        height:24px;
        border-radius:999px;
        background:rgba(255,255,255,0.14);
        border:1px solid rgba(255,255,255,0.2);
        flex-shrink:0;
      }
      .st-theme-switch::after{
        content:"";
        position:absolute;
        top:2px;
        left:2px;
        width:18px;
        height:18px;
        border-radius:50%;
        background:#ffffff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        transition:transform .2s ease;
      }
      .st-theme-toggle[data-theme="light"] .st-theme-icon{
        background:rgba(120,200,255,0.2);
        color:#8fd8ff;
        border-color:rgba(120,200,255,0.42);
      }
      .st-theme-toggle[data-theme="light"] .st-theme-switch{
        background:rgba(120,200,255,0.26);
        border-color:rgba(120,200,255,0.4);
      }
      .st-theme-toggle[data-theme="light"] .st-theme-switch::after{
        transform:translateX(24px);
      }
      .st-theme-label{
        min-width:40px;
        text-align:left;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeTheme(value) {
    return value === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const next = normalizeTheme(theme);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
    return next;
  }

  function savedTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return "dark";
    }
  }

  function mount(options) {
    ensureStyles();
    const opts = options || {};
    const container = opts.container || document.body;
    if (!container) return null;
    if (container.querySelector(".st-theme-toggle")) return container.querySelector(".st-theme-toggle");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "st-theme-toggle";
    btn.innerHTML = `
      <span class="st-theme-icon"><i class="fas fa-moon"></i></span>
      <span class="st-theme-switch" aria-hidden="true"></span>
      <span class="st-theme-label">Dark</span>
    `;

    const icon = btn.querySelector(".st-theme-icon i");
    const label = btn.querySelector(".st-theme-label");

    function sync(theme) {
      const current = normalizeTheme(theme);
      btn.dataset.theme = current;
      if (label) label.textContent = current === "light" ? "Light" : "Dark";
      if (icon) icon.className = current === "light" ? "fas fa-sun" : "fas fa-moon";
      btn.setAttribute("aria-label", `Switch theme to ${current === "light" ? "dark" : "light"}`);
    }

    let currentTheme = applyTheme(savedTheme());
    sync(currentTheme);

    btn.addEventListener("click", () => {
      currentTheme = applyTheme(currentTheme === "light" ? "dark" : "light");
      sync(currentTheme);
    });

    container.appendChild(btn);
    return btn;
  }

  window.StatisticoThemeToggle = {
    mount,
    applySavedTheme: () => applyTheme(savedTheme()),
    setTheme: (theme) => applyTheme(theme),
    getTheme: () => normalizeTheme(document.documentElement.getAttribute("data-theme") || savedTheme()),
  };

  ensureStyles();
  applyTheme(savedTheme());
})();

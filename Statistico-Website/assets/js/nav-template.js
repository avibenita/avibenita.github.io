/**
 * Navigation Template - Inline approach (no fetch required)
 */

// Navigation links - dynamically adjusted based on page location
function getNavLinks() {
  return {
    home: '/index.html',
    why: '/Statistico-Website/why-another-package.html',
    how: '/Statistico-Website/how-it-works.html',
    calculators: '/Statistico-Website/index-Calculators.html',
    analytics: '/Statistico-Website/index-Analytics.html',
    addins: '/Statistico-Website/index-Addins.html',
    support: '/Statistico-Website/Support/index.html'
  };
}

const NAV_TEMPLATE = `
<nav class="sticky-nav" id="stickyNav">
  <div class="nav-container">
    <a href="javascript:void(0)" class="nav-logo" id="nav-logo-link">
      <span class="goldish">Statistico™-Interactive</span>
    </a>

    <ul class="nav-menu" id="navMenu">
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="home" id="link-home">
          Home
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="why" id="link-why">
          Why Statistico?
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="how" id="link-how">
          How It Works
        </a>
      </li>
      <li class="nav-item nav-item--product-start nav-item--dropdown" id="nav-products-item">
        <button class="nav-link nav-link--product-parent" id="nav-products-btn" aria-haspopup="true" aria-expanded="false">
          Platform
          <span class="nav-dropdown-caret" aria-hidden="true">&#8964;</span>
        </button>
        <ul class="nav-dropdown" id="nav-products-dropdown" role="menu">
          <li class="nav-dropdown-header" role="presentation">Statistico Platform</li>
          <li role="none">
            <a href="javascript:void(0)" class="nav-dropdown-item" data-page="calculators" id="link-calculators" role="menuitem">
              <span class="nav-dropdown-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="12" height="12" rx="2"/>
                  <line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/>
                  <line x1="5" y1="11" x2="8" y2="11"/>
                </svg>
              </span>
              <span class="nav-dropdown-text">
                <span class="nav-dropdown-title">Calculators Hub</span>
                <span class="nav-dropdown-desc">Statistical calculators &amp; tools</span>
              </span>
              <span class="nav-dropdown-arrow" aria-hidden="true">&#8594;</span>
            </a>
          </li>
          <li role="none">
            <a href="javascript:void(0)" class="nav-dropdown-item" data-page="analytics" id="link-analytics" role="menuitem">
              <span class="nav-dropdown-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1,12 5,7 8,10 11,5 15,3"/>
                </svg>
              </span>
              <span class="nav-dropdown-text">
                <span class="nav-dropdown-title">Analytics Suite</span>
                <span class="nav-dropdown-desc">Interactive statistical analysis</span>
              </span>
              <span class="nav-dropdown-arrow" aria-hidden="true">&#8594;</span>
            </a>
          </li>
          <li role="none">
            <a href="javascript:void(0)" class="nav-dropdown-item" data-page="addins" id="link-addins" role="menuitem">
              <span class="nav-dropdown-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="1" width="10" height="14" rx="1.5"/>
                  <line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/>
                  <line x1="6" y1="11" x2="8.5" y2="11"/>
                </svg>
              </span>
              <span class="nav-dropdown-text">
                <span class="nav-dropdown-title">Applications</span>
                <span class="nav-dropdown-desc">Workflow-ready applications</span>
              </span>
              <span class="nav-dropdown-arrow" aria-hidden="true">&#8594;</span>
            </a>
          </li>
        </ul>
      </li>
      <li class="nav-item nav-item--after-products">
        <a href="javascript:void(0)" class="nav-link" data-page="support" id="link-support">
          Contact
        </a>
      </li>
    </ul>

    <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle color theme" aria-pressed="false" title="Toggle dark/light">
      <span class="theme-mode-icon" aria-hidden="true">
        <svg class="icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </span>
      <span class="theme-switch" aria-hidden="true">
        <span class="theme-switch-thumb"></span>
      </span>
      <span class="theme-toggle-label">Dark</span>
    </button>

    <button class="mobile-toggle" id="mobileToggle" aria-label="Toggle mobile menu">
      <i class="fa-solid fa-bars"></i>
    </button>
  </div>
</nav>
`;

const NAV_STYLE = `
:root {
  --site-surface-0: #0c1624;
  --site-surface-1: #1a1f2e;
  --site-surface-2: #242938;
  --site-border: #2d3748;
  --site-text-primary: #ffffff;
  --site-text-secondary: rgba(255,255,255,0.82);
  --site-text-muted: rgba(255,255,255,0.62);
  --site-shadow-xl: 0px 8px 28px rgba(0, 0, 0, 0.34);
  --site-bg-glow-warm: rgba(255,165,120,.15);
  --site-bg-glow-cool: rgba(120,200,255,.12);
}

:root[data-theme="light"] {
  --site-surface-0: #f3f7fc;
  --site-surface-1: #ffffff;
  --site-surface-2: #eaf1fb;
  --site-border: rgba(15, 23, 42, 0.14);
  --site-text-primary: #0f172a;
  --site-text-secondary: rgba(15, 23, 42, 0.82);
  --site-text-muted: rgba(15, 23, 42, 0.6);
  --site-shadow-xl: 0px 10px 26px rgba(15, 23, 42, 0.1);
  --site-bg-glow-warm: rgba(255,165,120,.12);
  --site-bg-glow-cool: rgba(120,200,255,.1);
}

.sticky-nav,
.sticky-nav * {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.sticky-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(90deg, #06152a 0%, #0a1730 55%, #141f38 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.sticky-nav.scrolled {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
}

:root[data-theme="light"] .sticky-nav {
  background: linear-gradient(90deg, #f8fbff 0%, #f0f6ff 58%, #e9f2ff 100%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  min-height: 76px;
}

.nav-logo {
  font-size: 1rem;
  font-weight: 800;
  color: rgb(255,165,120);
  text-decoration: none;
  background: linear-gradient(45deg, rgb(255,165,120), #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.2s ease;
  text-shadow: 0 2px 8px rgba(91, 68, 56, 0.3);
  margin-right: 22px;
  line-height: 1.02;
}

.nav-logo .goldish {
  font-size: inherit;
  font-weight: inherit;
  color: inherit !important;
  text-shadow: none;
}

.nav-logo:hover {
  transform: translateY(-1px);
  filter: brightness(1.12);
}

.nav-menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;
  align-items: center;
}

.nav-item {
  position: relative;
}

.nav-item--product-start,
.nav-item--after-products {
  margin-left: 12px;
  padding-left: 12px;
}

.nav-item--product-start::before,
.nav-item--after-products::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 32px;
  background: linear-gradient(180deg, rgba(160,220,255,0.58), rgba(255,182,140,0.72));
  opacity: 1;
  box-shadow: 0 0 10px rgba(120,200,255,0.22);
  pointer-events: none;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px;
  color: rgba(255,255,255,0.92);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.88rem;
  border-radius: 16px;
  position: relative;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  white-space: nowrap;
  overflow: visible;
  line-height: 1.15;
}

.nav-link i {
  font-size: 0.82rem;
  line-height: 1;
}

.nav-link::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.08);
  border-radius: 16px;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.nav-link:hover::before {
  opacity: 1;
}

.nav-link:hover {
  transform: translateY(-1px);
  color: #ffffff;
  box-shadow: none;
}

.nav-link.active {
  background: linear-gradient(180deg, rgba(244,174,132,0.9) 0%, rgba(232,157,112,0.86) 100%);
  color: white;
  border: 1px solid rgba(255, 204, 178, 0.42);
  box-shadow: 0 4px 12px rgba(232,157,112,0.2);
}

.nav-link.active::before {
  opacity: 0;
}

:root[data-theme="light"] .nav-logo {
  background: linear-gradient(45deg, #b45309, #1d4ed8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:root[data-theme="light"] .nav-link {
  color: rgba(15, 23, 42, 0.9);
}

:root[data-theme="light"] .nav-link::before {
  background: rgba(15, 23, 42, 0.06);
}

:root[data-theme="light"] .nav-link:hover {
  color: #0f172a;
}

:root[data-theme="light"] .nav-link--product {
  border-color: rgba(180, 83, 9, 0.18);
  background: rgba(180, 83, 9, 0.06);
  box-shadow: inset 0 0 0 1px rgba(180, 83, 9, 0.05);
}

:root[data-theme="light"] .nav-link--product-lite {
  background: rgba(180, 83, 9, 0.05);
  color: rgba(30, 41, 59, 0.92);
}

:root[data-theme="light"] .nav-link--product-core {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.26);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
  color: rgba(30, 58, 138, 0.95);
}

:root[data-theme="light"] .nav-link-tag {
  border-color: rgba(180, 83, 9, 0.3);
  background: rgba(180, 83, 9, 0.1);
  color: rgba(146, 64, 14, 0.96);
}

:root[data-theme="light"] .nav-link.active {
  background: linear-gradient(180deg, rgba(37,99,235,0.95) 0%, rgba(29,78,216,0.9) 100%);
  border-color: rgba(30,64,175,0.32);
  box-shadow: 0 4px 12px rgba(37,99,235,0.24);
}

.nav-link--product {
  border: 1px solid rgba(255,165,120,0.2);
  background: rgba(255,165,120,0.06);
  box-shadow: inset 0 0 0 1px rgba(255,165,120,0.04);
}

.nav-link--product-lite {
  background: rgba(255,165,120,0.05);
  border-color: rgba(255,165,120,0.18);
  color: rgba(255,239,231,0.9);
}

.nav-link--product-core {
  background: rgba(120,200,255,0.10);
  border-color: rgba(120,200,255,0.42);
  box-shadow: inset 0 0 0 1px rgba(120,200,255,0.16);
  color: rgba(236,246,255,0.98);
}

.nav-link--product:hover {
  background: rgba(255,165,120,0.14);
}

.nav-link--product-core:hover {
  background: rgba(120,200,255,0.16);
  box-shadow: inset 0 0 0 1px rgba(120,200,255,0.24);
}

.nav-link-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,165,120,0.35);
  background: rgba(255,165,120,0.15);
  color: rgba(255,233,220,0.98);
  font-size: 0.63rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1;
  font-weight: 700;
}

/* ── Products dropdown ── */
.nav-item--dropdown {
  position: relative;
}

.nav-link--product-parent {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(255,165,120,0.08);
  border: 1px solid rgba(255,165,120,0.22);
  border-radius: 16px;
  color: rgba(255,239,231,0.95);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
  white-space: nowrap;
  font-family: inherit;
}

.nav-link--product-parent:hover {
  background: rgba(255,165,120,0.16);
  transform: translateY(-1px);
  color: #fff;
}

.nav-link--product-parent.active {
  background: linear-gradient(180deg, rgba(244,174,132,0.9) 0%, rgba(232,157,112,0.86) 100%);
  color: white;
  border-color: rgba(255,204,178,0.42);
}

.nav-dropdown-caret {
  font-size: 0.9rem;
  line-height: 1;
  display: inline-block;
  transition: transform 0.22s ease;
}

.nav-item--dropdown[data-open="true"] .nav-dropdown-caret {
  transform: rotate(180deg);
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  min-width: 256px;
  background: linear-gradient(160deg, #0f1e35 0%, #162336 100%);
  border: 1px solid rgba(255,165,120,0.22);
  border-radius: 18px;
  padding: 6px 6px 8px;
  list-style: none;
  margin: 0;
  box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  z-index: 200;
}

.nav-dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 6px;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  background: rgba(255,165,120,0.3);
}

.nav-item--dropdown[data-open="true"] .nav-dropdown {
  opacity: 1;
  visibility: visible;
  pointer-events: all;
  transform: translateX(-50%) translateY(0);
}

.nav-dropdown-header {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: rgba(255,165,120,.6);
  padding: 8px 12px 6px;
  user-select: none;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: rgba(220,235,255,0.88);
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
}

.nav-dropdown-item:hover,
.nav-dropdown-item.active {
  background: rgba(255,165,120,0.1);
  color: #fff;
  filter: none;
}

.nav-dropdown-item.active {
  background: rgba(255,165,120,0.15);
}

.nav-dropdown-arrow {
  margin-left: auto;
  font-size: 0.8rem;
  color: rgba(255,165,120,0.4);
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.nav-dropdown-item:hover .nav-dropdown-arrow {
  opacity: 1;
  transform: translateX(0);
}

.nav-dropdown-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255,165,120,0.1);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 0.9rem;
  color: rgba(255,165,120,0.9);
}

.nav-dropdown-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-dropdown-title {
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.2;
}

.nav-dropdown-desc {
  font-size: 0.74rem;
  color: rgba(180,200,230,0.65);
  line-height: 1.2;
}

:root[data-theme="light"] .nav-link--product-parent {
  background: rgba(180,83,9,0.07);
  border-color: rgba(180,83,9,0.22);
  color: rgba(30,41,59,0.92);
}

:root[data-theme="light"] .nav-link--product-parent:hover {
  background: rgba(180,83,9,0.13);
  color: #0f172a;
}

:root[data-theme="light"] .nav-dropdown {
  background: linear-gradient(160deg, #f8fbff 0%, #eef5ff 100%);
  border-color: rgba(180,83,9,0.18);
  box-shadow: 0 16px 48px rgba(15,23,42,0.18);
}

:root[data-theme="light"] .nav-dropdown-header {
  color: rgba(180,83,9,0.55);
}

:root[data-theme="light"] .nav-dropdown-item {
  color: rgba(15,23,42,0.82);
}

:root[data-theme="light"] .nav-dropdown-item:hover {
  background: rgba(180,83,9,0.07);
  color: #0f172a;
}

:root[data-theme="light"] .nav-dropdown-icon {
  background: rgba(180,83,9,0.1);
  color: rgba(180,83,9,0.85);
}

:root[data-theme="light"] .nav-dropdown-desc {
  color: rgba(15,23,42,0.48);
}

.nav-link.active .nav-link-tag {
  background: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.36);
  color: #ffffff;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 42px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.2);
  background: linear-gradient(180deg, rgba(49, 61, 90, 0.92), rgba(39, 49, 76, 0.9));
  color: rgba(245,249,255,0.96);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 22px rgba(5, 10, 26, 0.28);
}

.theme-toggle:hover {
  background: linear-gradient(180deg, rgba(58, 72, 104, 0.95), rgba(44, 57, 88, 0.92));
  transform: translateY(-1px);
}

.theme-mode-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 196, 106, 0.14);
  color: #ffcd6f;
  font-size: 0.78rem;
}

.theme-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255,255,255,0.24);
  border: 1px solid rgba(255,255,255,0.24);
}

.theme-switch-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.25);
  transition: transform 0.22s ease;
}

.theme-toggle-label {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1;
}

:root[data-theme="light"] .theme-toggle {
  border-color: rgba(15, 23, 42, 0.2);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(240,246,255,0.94));
  color: rgba(15, 23, 42, 0.92);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
}

:root[data-theme="light"] .theme-toggle:hover {
  background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(234,243,255,0.97));
}

:root[data-theme="light"] .theme-mode-icon {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

:root[data-theme="light"] .theme-switch {
  background: rgba(148, 163, 184, 0.35);
  border-color: rgba(148, 163, 184, 0.42);
}

:root[data-theme="light"] .theme-switch-thumb {
  transform: translateX(16px);
}

.sticky-nav.scrolled .nav-container {
  min-height: 68px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.sticky-nav.scrolled .nav-link {
  min-height: 40px;
  border-radius: 13px;
}

.sticky-nav.scrolled .nav-logo {
  font-size: 0.94rem;
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mobile-toggle:hover {
  background: rgba(255, 165, 120, 0.1);
  color: rgb(255,165,120);
}

body {
  padding-top: 88px;
}

@media (max-width: 768px) {
  .theme-toggle {
    display: none;
  }

  .mobile-toggle {
    display: block;
  }

  .nav-menu {
    position: fixed;
    top: 74px;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, rgba(12, 22, 36, 0.98) 0%, rgba(26, 31, 46, 0.98) 100%);
    backdrop-filter: blur(20px);
    flex-direction: column;
    gap: 0;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgba(255, 165, 120, 0.2);
    transform: translateY(-100vh);
    opacity: 0;
    visibility: hidden;
    transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .nav-menu.active {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }

  .nav-item {
    width: 100%;
  }

  .nav-item--product-start,
  .nav-item--after-products {
    margin-left: 0;
    padding-left: 0;
  }

  .nav-item--product-start::before,
  .nav-item--after-products::before {
    display: none;
  }

  .nav-link {
    width: 100%;
    justify-content: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 12px;
    font-size: 0.95rem;
  }

  .nav-link-tag {
    display: none;
  }

  /* Mobile: flatten dropdown inline */
  .nav-item--dropdown {
    width: 100%;
  }

  .nav-link--product-parent {
    width: 100%;
    justify-content: center;
    padding: 12px 16px;
    margin-bottom: 4px;
    border-radius: 12px;
    font-size: 0.95rem;
  }

  .nav-dropdown {
    position: static;
    transform: none;
    opacity: 1;
    visibility: visible;
    pointer-events: all;
    box-shadow: none;
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,165,120,0.12);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 8px;
    display: none;
  }

  .nav-dropdown::before { display: none; }
  .nav-dropdown-header { display: none; }

  .nav-item--dropdown[data-open="true"] .nav-dropdown {
    display: block;
  }

  .nav-container {
    padding: 0 16px;
    min-height: 68px;
  }

  .nav-logo {
    font-size: 0.96rem;
  }

  body {
    padding-top: 74px;
  }
}
`;

const FOOTER_TEMPLATE = `
<footer id="contact">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-section">
        <h4>Products</h4>
        <a href="https://www.metrics-institute.net/statistical-calculators" target="_blank">Statistical Calculators Hub</a>
        <a href="javascript:void(0)" id="footer-link-home"><span class="goldish">Statistico‑Interactive™</span></a>
        <a href="javascript:void(0)" id="footer-link-addins">Applications</a>
      </div>
      <div class="footer-section">
        <h4>Resources</h4>
        <a href="javascript:void(0)" id="footer-link-why">Why Another Package?</a>
        <a href="javascript:void(0)" id="footer-link-how">How It Works</a>
        <a href="#" onclick="alert('Coming soon!')">Video Demos</a>
      </div>
      <div class="footer-section">
        <h4>Company</h4>
        <a href="#" onclick="alert('Coming soon!')">About Us</a>
        <a href="#" onclick="alert('Coming soon!')">Contact</a>
        <a href="#" onclick="alert('Coming soon!')">Terms & Conditions</a>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Statistico™ Interactive Suite. Revolutionizing statistical computing, one analysis at a time.</div>
  </div>
</footer>
`;

// Load components immediately (no fetch required)
(function() {
  'use strict';

  // Ensure Font Awesome is loaded — nav-template is self-contained
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const faLink = document.createElement('link');
    faLink.rel  = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
    document.head.appendChild(faLink);
  }

  const THEME_STORAGE_KEY = 'statistico-theme';

  function getStoredTheme() {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (error) {
      // Ignore storage errors and fall back to default theme.
    }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      // Ignore storage errors.
    }
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const isLight = theme === 'light';
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
      themeToggle.classList.toggle('is-light', isLight);
      const themeLabel = themeToggle.querySelector('.theme-toggle-label');
      if (themeLabel) {
        themeLabel.textContent = isLight ? 'Light' : 'Dark';
      }
      const themeIcon = themeToggle.querySelector('.theme-mode-icon i');
      if (themeIcon) {
        themeIcon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      const iconMoon = themeToggle.querySelector('.icon-moon');
      const iconSun  = themeToggle.querySelector('.icon-sun');
      if (iconMoon) iconMoon.style.display = isLight ? 'none'   : '';
      if (iconSun)  iconSun.style.display  = isLight ? ''       : 'none';
    }
  }

  function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    applyTheme(document.documentElement.getAttribute('data-theme') || getStoredTheme());
    themeToggle.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
    });
  }

  applyTheme(getStoredTheme());

  // Inject shared header styles so all pages use the same header.
  if (!document.getElementById('statistico-shared-nav-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'statistico-shared-nav-style';
    styleEl.textContent = NAV_STYLE;
    document.head.appendChild(styleEl);
  }

  // Insert navigation
  const navPlaceholder = document.getElementById('nav-placeholder');
  if (navPlaceholder) {
    navPlaceholder.innerHTML = NAV_TEMPLATE;
    initializeNavigation();
    initializeThemeToggle();
  }

  // Insert footer
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = FOOTER_TEMPLATE;
    
    // Wire up footer links
    const links = getNavLinks();
    const footerHomeLink = document.getElementById('footer-link-home');
    const footerWhyLink = document.getElementById('footer-link-why');
    const footerHowLink = document.getElementById('footer-link-how');
    const footerAddinsLink = document.getElementById('footer-link-addins');

    if (footerHomeLink) footerHomeLink.href = links.home;
    if (footerWhyLink) footerWhyLink.href = links.why;
    if (footerHowLink) footerHowLink.href = links.how;
    if (footerAddinsLink) footerAddinsLink.href = links.addins;
  }

  // Initialize navigation functionality
  function initializeNavigation() {
    const stickyNav = document.getElementById('stickyNav');
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (!stickyNav || !mobileToggle || !navMenu) return;

    // Wire up navigation links with correct paths
    const links = getNavLinks();
    document.getElementById('nav-logo-link').href = links.home;
    document.getElementById('link-home').href = links.home;
    document.getElementById('link-why').href = links.why;
    document.getElementById('link-how').href = links.how;
    document.getElementById('link-calculators').href = links.calculators;
    document.getElementById('link-analytics').href = links.analytics;
    document.getElementById('link-addins').href = links.addins;
    document.getElementById('link-support').href = links.support;

    // Products dropdown
    const productsItem = document.getElementById('nav-products-item');
    const productsBtn  = document.getElementById('nav-products-btn');
    function openDropdown()  { productsItem.dataset.open = 'true';  productsBtn.setAttribute('aria-expanded', 'true'); }
    function closeDropdown() { delete productsItem.dataset.open;    productsBtn.setAttribute('aria-expanded', 'false'); }

    productsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      productsItem.dataset.open === 'true' ? closeDropdown() : openDropdown();
    });

    // Close on outside click
    document.addEventListener('click', function() { closeDropdown(); });
    productsItem.addEventListener('click', function(e) { e.stopPropagation(); });

    // Close on Escape
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDropdown(); });

    // Mobile menu toggle
    mobileToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });

    // Set active page
    setActivePage();

    // Scroll effect
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 100) {
        stickyNav.classList.add('scrolled');
      } else {
        stickyNav.classList.remove('scrolled');
      }
    });

    // Smooth scroll for anchor links (on same page)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            navMenu.classList.remove('active');
          }
        }
      });
    });

    // Section highlighting for internal pages
    const sections = document.querySelectorAll('section[id]');
    if (sections.length > 0) {
      window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
          }
        });

        document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
          }
        });
      });
    }
  }

  // Set active page based on URL
  function setActivePage() {
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const currentFile = currentPath.split('/').pop() || 'index.html';
    
    // Determine which page we're on
    let activePage = 'home';
    if (currentFile === 'index.html') {
      activePage = 'home';
    } else if (currentFile === 'why-another-package.html') {
      activePage = 'why';
    } else if (currentFile === 'how-it-works.html') {
      activePage = 'how';
    } else if (currentFile === 'index-Calculators.html') {
      activePage = 'calculators';
    } else if (currentFile === 'index-Analytics.html') {
      activePage = 'analytics';
    } else if (currentFile === 'index-Addins.html') {
      activePage = 'addins';
    } else if (currentPath.includes('Support')) {
      activePage = 'support';
    }
    
    // Set active class
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === activePage) {
        link.classList.add('active');
      }
    });

    // Also mark dropdown items and the Products button active
    const productPages = ['calculators', 'analytics', 'addins'];
    const productsBtn = document.getElementById('nav-products-btn');
    if (productsBtn) {
      productsBtn.classList.toggle('active', productPages.includes(activePage));
    }
    document.querySelectorAll('.nav-dropdown-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === activePage);
    });
  }

})();


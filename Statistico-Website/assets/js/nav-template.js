/**
 * Navigation Template - Inline approach (no fetch required)
 */

// Navigation links - dynamically adjusted based on page location
function getNavLinks() {
  return {
    home: '/index.html',
    about: '/Statistico-Website/about-us.html',
    contact: '/Statistico-Website/contact.html',
    terms: '/Statistico-Website/terms-and-conditions.html',
    why: '/Statistico-Website/why-another-package.html',
    how: '/Statistico-Website/how-it-works.html',
    calculators: '/Statistico-Website/index-Calculators.html',
    analytics: '/Statistico-Website/index-Analytics.html',
    addins: '/Statistico-Website/index-Addins.html',
    faq: '/Statistico-Website/faq.html',
  };
}

const NAV_TEMPLATE = `
<nav class="sticky-nav" id="stickyNav">
  <div class="nav-container">
    <a href="javascript:void(0)" class="nav-logo" id="nav-logo-link" aria-label="Statistico Interactive">
      <svg class="nav-logo-svg" viewBox="0 0 192 44" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="nl-arc" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#4f8eff"/>
            <stop offset="100%" stop-color="#1a56d6"/>
          </linearGradient>
          <linearGradient id="nl-bar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00e0cc"/>
            <stop offset="100%" stop-color="#00a8b5"/>
          </linearGradient>
        </defs>
        <!-- S top arc -->
        <path d="M 32,9 C 32,5 27,3 21,3 C 13,3 8,8 8,14 C 8,20 13,22 21,22" stroke="url(#nl-arc)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <!-- S bottom arc -->
        <path d="M 21,22 C 29,22 36,24 36,30 C 36,37 30,41 22,41 C 14,41 10,37 10,33" stroke="url(#nl-arc)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <!-- 4 ascending bars -->
        <rect x="11" y="29" width="4" height="11" rx="1.2" fill="url(#nl-bar)"/>
        <rect x="17" y="24" width="4" height="16" rx="1.2" fill="url(#nl-bar)"/>
        <rect x="23" y="19" width="4" height="21" rx="1.2" fill="url(#nl-bar)"/>
        <rect x="29" y="14" width="4" height="26" rx="1.2" fill="url(#nl-bar)"/>
        <!-- Vertical divider -->
        <line x1="50" y1="9" x2="50" y2="35" class="nl-div"/>
        <!-- STATISTICO -->
        <text x="60" y="22" class="nl-title" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="17" letter-spacing="2">STATISTICO</text>
        <!-- INTERACTIVE with flanking lines -->
        <line x1="60" y1="30" x2="74" y2="30" class="nl-sep"/>
        <text x="125" y="37" class="nl-sub" font-family="Segoe UI,Arial,sans-serif" font-weight="500" font-size="8" letter-spacing="2.5" text-anchor="middle">INTERACTIVE</text>
        <line x1="176" y1="30" x2="190" y2="30" class="nl-sep"/>
      </svg>
    </a>

    <ul class="nav-menu" id="navMenu">
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="home" id="link-home">
          Home
        </a>
      </li>

      <!-- Products group — segmented control -->
      <li class="nav-item nav-item--products-group">
        <span class="nav-products-label">Statistico Suite</span>
        <div class="nav-products-row" id="nav-products-row">
          <div class="nav-products-slider" id="nav-products-slider"></div>
          <a href="javascript:void(0)" class="nav-link nav-link--product" data-page="calculators" id="link-calculators" title="Statistico Calculators Hub">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
              <line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/>
              <line x1="5" y1="11" x2="8" y2="11"/>
            </svg>
            Calculators
          </a>
          <a href="javascript:void(0)" class="nav-link nav-link--product-core" data-page="analytics" id="link-analytics" title="Statistico Analytics Hub">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="1,12 5,7 8,10 11,5 15,3"/>
            </svg>
            Analytics
          </a>
          <a href="javascript:void(0)" class="nav-link nav-link--product-lite" data-page="addins" id="link-addins" title="Statistico Applications Hub">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="1" width="10" height="14" rx="1.5"/>
              <line x1="6" y1="5" x2="10" y2="5"/><line x1="6" y1="8" x2="10" y2="8"/>
              <line x1="6" y1="11" x2="8.5" y2="11"/>
            </svg>
            Applications
          </a>
        </div>
      </li>

      <li class="nav-item nav-item--sep-left">
        <a href="javascript:void(0)" class="nav-link" data-page="why" id="link-why">
          Why
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="how" id="link-how">
          How It Works
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="faq" id="link-faq">
          FAQ
        </a>
      </li>

      <!-- Hidden from main nav; kept for routing/footer -->
      <li class="nav-item nav-item--hidden" aria-hidden="true">
        <a href="javascript:void(0)" class="nav-link" data-page="about" id="link-about" tabindex="-1">About Us</a>
      </li>
      <li class="nav-item nav-item--hidden" aria-hidden="true">
        <a href="javascript:void(0)" class="nav-link" data-page="contact" id="link-contact" tabindex="-1">Contact</a>
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
  padding: 6px 24px;
  min-height: 84px;
}

.nav-logo {
  text-decoration: none;
  display: flex;
  align-items: center;
  margin-right: 22px;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.nav-logo:hover { opacity: 0.85; }

/* SVG inline logo */
.nav-logo-svg {
  height: 54px;
  width: auto;
  display: block;
  overflow: visible;
  margin-top: 4px;
}

/* SVG element colours – dark mode (default) */
.nl-title { fill: #ffffff; }
.nl-sub   { fill: rgba(0, 196, 204, 0.48); }
.nl-div   { stroke: rgba(255,255,255,0.18); stroke-width: 1; }
.nl-sep   { stroke: rgba(0, 196, 204, 0.35); stroke-width: 0.9; }

/* SVG element colours – light mode */
:root[data-theme="light"] .nl-title { fill: #06152a; }
:root[data-theme="light"] .nl-sub   { fill: rgba(0, 119, 168, 0.60); }
:root[data-theme="light"] .nl-div   { stroke: rgba(0,0,0,0.15); }
:root[data-theme="light"] .nl-sep   { stroke: rgba(0, 119, 168, 0.45); }

/* Hide old image-based logo remnants */
.nav-logo-img  { display: none !important; }
.nav-logo--dark, .nav-logo--light { display: none !important; }
.nav-logo .goldish { display: none; }

/* ── Brand name typography ── */
.brand-tm {
  font-size: 0.55em;
  vertical-align: super;
  line-height: 0;
}

.brand-sub {
  font-size: 0.8em;
  margin-left: 2px;
  font-weight: 500;
  vertical-align: baseline;
  -webkit-text-fill-color: rgba(120, 200, 255, 0.88);
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
}

:root[data-theme="light"] .brand-sub {
  -webkit-text-fill-color: rgba(29, 78, 216, 0.75);
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

/* legacy separator classes — kept for compatibility but lines removed */
.nav-item--product-start,
.nav-item--after-products {
  margin-left: 8px;
}

.nav-item--product-start::before,
.nav-item--after-products::before {
  display: none;
}

/* ── Products group with label ── */
.nav-item--products-group {
  margin-left: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  position: relative;
}

.nav-item--products-group::before { display: none; }

.nav-products-label {
  font-size: 0.56rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.32);
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

/* Segmented control bar */
.nav-products-row {
  display: flex;
  gap: 2px;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
  padding: 3px;
  position: relative;
}

/* Sliding highlight */
.nav-products-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  height: calc(100% - 6px);
  border-radius: 13px;
  background: rgba(120,200,255,0.16);
  box-shadow: 0 0 12px rgba(120,200,255,0.14);
  transition: transform 0.22s cubic-bezier(0.34,1.2,0.64,1), width 0.22s cubic-bezier(0.34,1.2,0.64,1), opacity 0.18s ease;
  pointer-events: none;
  opacity: 0;
  will-change: transform, width;
}

.nav-products-row:hover .nav-products-slider { opacity: 1; }

/* Product links inside segmented control — no individual borders */
.nav-products-row .nav-link--product,
.nav-products-row .nav-link--product-core,
.nav-products-row .nav-link--product-lite {
  border: none;
  background: transparent;
  box-shadow: none;
  position: relative;
  z-index: 1;
  transition: color 0.15s ease;
}

.nav-products-row .nav-link {
  min-height: 34px;
  padding: 5px 11px;
  font-size: 0.83rem;
}

/* Separator before "Why" — spacing only, no line */
.nav-item--sep-left {
  margin-left: 20px;
  position: relative;
}

.nav-item--sep-left::before { display: none; }

/* Home: minimal weight */
.nav-link[data-page="home"] {
  opacity: 0.75;
  font-weight: 400;
  font-size: 0.85rem;
}

.nav-link[data-page="home"]:hover { opacity: 1; }

/* Hidden items (About, Contact) — kept in DOM for link wiring */
.nav-item--hidden {
  display: none !important;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px;
  color: rgba(255,255,255,0.92);
  text-decoration: none;
  font-weight: 500;
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
  background: rgba(120,200,255,0.14);
  color: rgba(200,238,255,1);
  border: 1px solid rgba(120,200,255,0.22);
  box-shadow: 0 0 10px rgba(120,200,255,0.1);
}

.nav-link.active::before {
  opacity: 0;
}

:root[data-theme="light"] .nav-logo { background: none; }

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
  background: rgba(37,99,235,0.10);
  color: rgba(30,58,138,0.95);
  border-color: rgba(37,99,235,0.24);
  box-shadow: 0 0 10px rgba(37,99,235,0.08);
}

.nav-link--product {
  font-weight: 700;
  border: 1px solid rgba(255,165,120,0.28);
  background: rgba(255,165,120,0.08);
  box-shadow: inset 0 0 0 1px rgba(255,165,120,0.05);
}

.nav-link--product-lite {
  font-weight: 700;
  background: rgba(255,165,120,0.06);
  border: 1px solid rgba(255,165,120,0.22);
  color: rgba(255,239,231,0.9);
}

.nav-link--product-core {
  font-weight: 700;
  background: rgba(120,200,255,0.14);
  border: 1px solid rgba(120,200,255,0.55);
  box-shadow: inset 0 0 0 1px rgba(120,200,255,0.18), 0 0 14px rgba(120,200,255,0.12);
  color: rgba(200,238,255,1);
}

.nav-link--product:hover {
  background: rgba(255,165,120,0.14);
}

.nav-link--product-core:hover {
  background: rgba(120,200,255,0.20);
  border-color: rgba(120,200,255,0.65);
  box-shadow: inset 0 0 0 1px rgba(120,200,255,0.28), 0 0 18px rgba(120,200,255,0.16);
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

/* active state for inline product links — keeps their tinted border, adds warm glow */
.nav-link--product.active {
  background: rgba(255,165,120,0.15);
  border-color: rgba(255,165,120,0.38);
  color: rgba(255,220,200,1);
}

.nav-link--product-core.active {
  background: rgba(120,200,255,0.16);
  border-color: rgba(120,200,255,0.46);
  color: rgba(200,235,255,1);
}

.nav-link--product-lite.active {
  background: rgba(255,165,120,0.11);
  border-color: rgba(255,165,120,0.28);
  color: rgba(255,220,200,1);
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

.sticky-nav.scrolled .nav-logo { opacity: 1; }
.sticky-nav.scrolled .nav-logo-svg { height: 36px; }

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

/* Hero section breathing room — gap between nav and hero, and hero and next section */
.hiw-hero,
.faq-hero,
.about-hero {
  padding-top: 112px !important;
  padding-bottom: 100px !important;
  margin-bottom: 16px !important;
}

.hero {
  padding-top: 80px !important;
  padding-bottom: 64px !important;
  margin-bottom: 16px !important;
}

/* ===== Light-mode page content overrides (global, applied to all pages) ===== */

/* Hero section backgrounds */
:root[data-theme="light"] .hiw-hero,
:root[data-theme="light"] .faq-hero {
  background:
    radial-gradient(ellipse at 15% 0%,  rgba(255,165,120,.18), transparent 40%),
    radial-gradient(ellipse at 85% 95%, rgba(120,200,255,.14), transparent 40%),
    linear-gradient(180deg, #eef5ff 0%, #e4effe 60%, #dae8fc 100%) !important;
}

:root[data-theme="light"] .about-hero {
  background:
    radial-gradient(ellipse at 16% 0%,  rgba(255,165,120,.18), transparent 40%),
    radial-gradient(ellipse at 84% 95%, rgba(120,200,255,.14), transparent 40%),
    linear-gradient(180deg, #eef5ff 0%, #e4effe 60%, #dae8fc 100%) !important;
}

/* Page hero h1 (hardcoded white in dark mode) */
:root[data-theme="light"] .hiw-hero h1,
:root[data-theme="light"] .about-hero h1 {
  color: #0f172a !important;
  text-shadow: none !important;
}

/* Page hero subtitle / body text */
:root[data-theme="light"] .hiw-hero-sub {
  color: rgba(15,23,42,.75) !important;
}

:root[data-theme="light"] .about-hero p {
  color: rgba(15,23,42,.72) !important;
}

/* Hero badges / kickers */
:root[data-theme="light"] .hiw-hero .page-kicker,
:root[data-theme="light"] .faq-hero .page-kicker,
:root[data-theme="light"] .about-hero .page-kicker {
  background: rgba(37,99,235,.07);
  border-color: rgba(37,99,235,.24);
  color: rgba(37,99,235,.88);
}

:root[data-theme="light"] .hiw-badge {
  background: linear-gradient(135deg, rgba(255,165,120,.14), rgba(120,200,255,.1));
  border-color: rgba(180,83,9,.3);
  color: rgba(146,64,14,.9);
}

/* Sticky progress nav (how-it-works) */
:root[data-theme="light"] .hiw-progress-wrap {
  background: linear-gradient(180deg, rgba(238,245,255,.97), rgba(228,240,255,.93)) !important;
  border-bottom-color: rgba(15,23,42,.1);
}

:root[data-theme="light"] .hiw-progress-step {
  color: rgba(15,23,42,.52);
}

:root[data-theme="light"] .hiw-progress-step:hover {
  color: rgba(15,23,42,.86);
}

:root[data-theme="light"] .hiw-progress-step.is-active {
  color: rgba(37,99,235,.92) !important;
}

:root[data-theme="light"] .hiw-progress-dot {
  background: rgba(15,23,42,.11);
  border-color: rgba(15,23,42,.10);
  box-shadow: inset 0 0 0 2px rgba(238,245,255,.9);
}

:root[data-theme="light"] .hiw-progress-step.is-active .hiw-progress-dot {
  background: linear-gradient(135deg, rgba(255,140,80,.9), rgba(37,99,235,.85));
  border-color: rgba(37,99,235,.35);
  box-shadow: 0 0 0 4px rgba(37,99,235,.08), 0 0 12px rgba(37,99,235,.15);
}

/* how-it-works slide modal */
:root[data-theme="light"] .hiw-modal-panel {
  background: linear-gradient(160deg, #f8fbff, #eef5ff) !important;
  border-color: rgba(37,99,235,.2);
}

/* FAQ search bar */
:root[data-theme="light"] .faq-search-wrap {
  background: rgba(255,255,255,.88);
  border-color: rgba(15,23,42,.16);
}

:root[data-theme="light"] .faq-search-wrap:focus-within {
  background: rgba(255,255,255,.97);
  border-color: rgba(37,99,235,.38);
}

/* FAQ accordion hover border */
:root[data-theme="light"] .faq-item:hover {
  border-color: rgba(15,23,42,.18) !important;
}

/* Shared footer styles for all pages */
footer#contact {
  background: var(--site-surface-1, #1a1f2e);
  border-top: 1px solid rgba(255, 165, 120, 0.12);
  color: var(--site-text-secondary, rgba(255,255,255,0.82));
  padding: 48px 0 20px;
  margin-top: 24px;
}

footer#contact .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

footer#contact .footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-bottom: 22px;
}

footer#contact .footer-section h4 {
  color: rgb(255,165,120);
  margin: 0 0 10px;
  letter-spacing: 0.2px;
}

footer#contact .footer-section a {
  display: block;
  color: var(--site-text-secondary, rgba(255,255,255,0.82));
  margin: 6px 0;
  text-decoration: none;
  transition: color 0.2s ease;
}

footer#contact .footer-section a:hover {
  color: rgb(255,165,120);
}

footer#contact .footer-bottom {
  border-top: 1px solid rgba(255, 165, 120, 0.12);
  margin-top: 16px;
  padding-top: 14px;
  text-align: center;
  font-size: 0.95rem;
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

  .nav-item--products-group {
    margin-left: 0;
    padding-left: 0;
    width: 100%;
  }

  .nav-item--products-group::before { display: none; }

  .nav-products-label { display: none; }

  .nav-products-row {
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .nav-products-row .nav-link {
    width: 100%;
    min-height: 44px;
    padding: 12px 16px;
    font-size: 0.95rem;
    justify-content: center;
  }

  .nav-item--sep-left {
    margin-left: 0;
    padding-left: 0;
  }

  .nav-item--sep-left::before { display: none; }

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

  footer#contact .footer-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
`;

const FOOTER_TEMPLATE = `
<footer id="contact">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-section">
        <h4>Products</h4>
        <a href="javascript:void(0)" id="footer-link-analytics">Statistico-Analytics-Hub™</a>
        <a href="javascript:void(0)" id="footer-link-calculators">Statistico-Calculators-Hub™</a>
        <a href="javascript:void(0)" id="footer-link-addins">Statistico-Applications-Hub™</a>
      </div>
      <div class="footer-section">
        <h4>Resources</h4>
        <a href="javascript:void(0)" id="footer-link-why">Why Another Package?</a>
        <a href="javascript:void(0)" id="footer-link-how">How It Works</a>
        <a href="#" onclick="alert('Coming soon!')">Video Demos</a>
      </div>
      <div class="footer-section">
        <h4>Company</h4>
        <a href="javascript:void(0)" id="footer-link-about">About Us</a>
        <a href="javascript:void(0)" id="footer-link-contact">Contact</a>
        <a href="javascript:void(0)" id="footer-link-terms">Terms & Conditions</a>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Statistico™ Suite. Revolutionizing statistical computing, one analysis at a time.</div>
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
    const footerAnalyticsLink = document.getElementById('footer-link-analytics');
    const footerCalculatorsLink = document.getElementById('footer-link-calculators');
    const footerWhyLink = document.getElementById('footer-link-why');
    const footerHowLink = document.getElementById('footer-link-how');
    const footerAboutLink = document.getElementById('footer-link-about');
    const footerContactLink = document.getElementById('footer-link-contact');
    const footerTermsLink = document.getElementById('footer-link-terms');
    const footerAddinsLink = document.getElementById('footer-link-addins');

    if (footerAnalyticsLink) footerAnalyticsLink.href = links.analytics;
    if (footerCalculatorsLink) footerCalculatorsLink.href = links.calculators;
    if (footerWhyLink) footerWhyLink.href = links.why;
    if (footerHowLink) footerHowLink.href = links.how;
    if (footerAboutLink) footerAboutLink.href = links.about;
    if (footerContactLink) footerContactLink.href = links.contact;
    if (footerTermsLink) footerTermsLink.href = links.terms;
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
    document.getElementById('link-faq').href = links.faq;
    document.getElementById('link-calculators').href = links.calculators;
    document.getElementById('link-analytics').href = links.analytics;
    document.getElementById('link-addins').href = links.addins;
    document.getElementById('link-about').href = links.about;
    document.getElementById('link-contact').href = links.contact;

    // Mobile menu toggle
    mobileToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });

    // ── Segmented-control slider ────────────────────────────────────────
    const productsRow    = document.getElementById('nav-products-row');
    const productsSlider = document.getElementById('nav-products-slider');

    if (productsRow && productsSlider) {
      const productLinks = productsRow.querySelectorAll('.nav-link');

      function positionSlider(link) {
        const rowRect  = productsRow.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        productsSlider.style.width = linkRect.width + 'px';
        productsSlider.style.transform = 'translateX(' + (linkRect.left - rowRect.left - 3) + 'px)';
      }

      productLinks.forEach(function(link) {
        link.addEventListener('mouseenter', function() { positionSlider(link); });
      });

      productsRow.addEventListener('mouseleave', function() {
        const active = productsRow.querySelector('.nav-link.active');
        if (active) { positionSlider(active); }
        else         { productsSlider.style.opacity = '0'; }
      });

      // Pin slider on active product on load (called after setActivePage)
      window.pinProductSlider = function() {
        const active = productsRow.querySelector('.nav-link.active');
        if (active) {
          positionSlider(active);
          productsSlider.style.opacity = '1';
        }
      };
    }
    // ──────────────────────────────────────────────────────────────────

    // Set active page
    setActivePage();
    // Pin slider after active page is set
    requestAnimationFrame(function() {
      if (typeof window.pinProductSlider === 'function') window.pinProductSlider();
    });

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
    } else if (currentFile === 'faq.html') {
      activePage = 'faq';
    } else if (currentFile === 'index-Calculators.html') {
      activePage = 'calculators';
    } else if (currentFile === 'index-Analytics.html') {
      activePage = 'analytics';
    } else if (currentFile === 'index-Addins.html') {
      activePage = 'addins';
    } else if (currentFile === 'about-us.html') {
      activePage = 'about';
    } else if (currentFile === 'contact.html') {
      activePage = 'contact';
    }
    
    // Set active class
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === activePage) {
        link.classList.add('active');
      }
    });
  }

})();


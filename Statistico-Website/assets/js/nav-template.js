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
      <svg class="nav-logo-svg" viewBox="0 -6 300 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Statistico Interactive">
        <defs>
          <linearGradient id="navLogoBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#2d76ff"/>
            <stop offset="100%" stop-color="#0ea5e9"/>
          </linearGradient>
          <linearGradient id="navLogoTeal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#51f0dc"/>
            <stop offset="100%" stop-color="#00a8b5"/>
          </linearGradient>
          <radialGradient id="navLogoSlider" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#d7f3ff"/>
            <stop offset="52%" stop-color="#6fb7ff"/>
            <stop offset="100%" stop-color="#2d76ff"/>
          </radialGradient>
        </defs>

        <g class="nav-logo-mark">
          <path d="M58 15 C58 6 47 2 35 2 C19 2 8 12 8 25 C8 37 19 43 35 43"
                stroke="url(#navLogoBlue)" stroke-width="10" fill="none" stroke-linecap="round"/>
          <path d="M35 43 C51 43 64 49 64 61 C64 75 51 82 35 82 C20 82 10 75 9 64"
                stroke="url(#navLogoBlue)" stroke-width="10" fill="none" stroke-linecap="round"/>
          <rect class="nav-logo-bar nav-logo-bar--1" x="18" y="51" width="8" height="24" rx="2" fill="url(#navLogoTeal)"/>
          <rect class="nav-logo-bar nav-logo-bar--2" x="30" y="43" width="8" height="32" rx="2" fill="url(#navLogoTeal)"/>
          <rect class="nav-logo-bar nav-logo-bar--3" x="42" y="34" width="8" height="41" rx="2" fill="url(#navLogoTeal)"/>
          <rect class="nav-logo-bar nav-logo-bar--4" x="54" y="25" width="8" height="50" rx="2" fill="url(#navLogoTeal)"/>
        </g>

        <text x="88" y="37" class="nav-logo-title" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="7">STATISTICO</text>
        <g class="nav-logo-subtitle-row">
          <line class="nav-logo-subline" x1="92" y1="63" x2="118" y2="63"/>
          <text x="191" y="68" class="nav-logo-subtitle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="4.6" text-anchor="middle">INTERACTIVE</text>
          <line class="nav-logo-subline" x1="264" y1="63" x2="296" y2="63"/>
          <circle class="nav-logo-slider-knob" cx="282" cy="63" r="5.2"/>
        </g>
      </svg>
    </a>

    <ul class="nav-menu" id="navMenu">
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="home" id="link-home">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 7.5L8 2.5L14 7.5"/>
            <path d="M3.5 7V14H12.5V7"/>
          </svg>
          Home
        </a>
      </li>

      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="why" id="link-why">
          The Paradigm
        </a>
      </li>

      <!-- Products group — flat inline cluster (no pill frame) -->
      <li class="nav-item nav-item--products-group">
        <div class="nav-products-row" id="nav-products-row">
          <a href="javascript:void(0)" class="nav-link nav-link--product" data-page="analytics" id="link-analytics" title="Statistico Analytics Suite">
            <img class="nav-suite-favicon" src="/favicon-max.svg?v=2026-05-07-red-contour" width="15" height="15" alt="" aria-hidden="true" decoding="async" />
            Analytics Suite
          </a>
          <a href="javascript:void(0)" class="nav-link nav-link--product" data-page="calculators" id="link-calculators" title="Statistico Calculators Hub">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
              <line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/>
              <line x1="5" y1="11" x2="8" y2="11"/>
            </svg>
            Calculators
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
        <a href="javascript:void(0)" class="nav-link" data-page="how" id="link-how">
          How It Works
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="faq" id="link-faq">
          FAQ
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="contact" id="link-contact">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="1" y="3" width="14" height="10" rx="1.5"/>
            <polyline points="1,4 8,9 15,4"/>
          </svg>
          Contact
        </a>
      </li>

      <!-- Hidden from main nav; kept for routing/ -->
      <li class="nav-item nav-item--hidden" aria-hidden="true">
        <a href="javascript:void(0)" class="nav-link" data-page="about" id="link-about" tabindex="-1">About Us</a>
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
  justify-content: flex-start;
  margin-right: 22px;
  width: 230px;
  height: 58px;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
}

.nav-logo:hover { opacity: 0.85; }

.nav-logo-svg {
  position: absolute;
  left: 0;
  top: 50%;
  width: 230px;
  height: 70px;
  max-width: none;
  transform: translateY(-50%);
  display: block;
  overflow: visible;
  transition: height 0.3s ease, width 0.3s ease;
}

.nav-logo-title,
.nav-logo-subtitle {
  fill: #ffffff;
}

.nav-logo-subtitle {
  opacity: 0.96;
}

.nav-logo-subline {
  stroke: #ffffff;
  stroke-width: 1.8;
  stroke-linecap: round;
  opacity: 0.9;
}

.nav-logo-slider-knob {
  fill: url(#navLogoSlider);
  stroke: rgba(255,255,255,0.74);
  stroke-width: 1;
  filter: drop-shadow(0 0 4px rgba(111,183,255,.62));
  transform-box: fill-box;
  transform-origin: center;
}

/* Logo mark: bars grow upward on load (ease-out curve, staggered) */
.nav-logo-bar {
  transform: scaleY(0);
  transform-origin: bottom center;
  transform-box: fill-box;
  animation: navLogoBarGrow 0.72s cubic-bezier(0.22, 0.82, 0.28, 1) forwards;
}
.nav-logo-bar--1 { animation-delay: 0.06s; }
.nav-logo-bar--2 { animation-delay: 0.14s; }
.nav-logo-bar--3 { animation-delay: 0.22s; }
.nav-logo-bar--4 { animation-delay: 0.30s; }

@keyframes navLogoBarGrow {
  from {
    transform: scaleY(0);
    opacity: 0.92;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-logo-bar {
    animation: none !important;
    transform: scaleY(1) !important;
    opacity: 1 !important;
  }
}

.nav-logo:hover .nav-logo-slider-knob {
  animation: navLogoSliderNudge .9s ease-in-out;
}

@keyframes navLogoSliderNudge {
  0%, 100% { transform: translateX(0); }
  45% { transform: translateX(7px); }
}

:root[data-theme="light"] .nav-logo-title,
:root[data-theme="light"] .nav-logo-subtitle {
  fill: #06152a;
}

:root[data-theme="light"] .nav-logo-subline {
  stroke: #06152a;
  opacity: 0.82;
}

:root[data-theme="light"] .nav-logo-slider-knob {
  stroke: rgba(6,21,42,0.42);
}

/* Hide legacy logo remnants */
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

/* ── Products group — flat cluster separated from main links ── */
.nav-item--products-group {
  margin-left: 14px;
  padding-left: 14px;
  border-left: 1px solid rgba(255,255,255,0.14);
  display: flex;
  align-items: center;
}

:root[data-theme="light"] .nav-item--products-group {
  border-left-color: rgba(15,23,42,0.14);
}

.nav-products-row {
  display: flex;
  gap: 2px;
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
}

.nav-products-row .nav-link--product,
.nav-products-row .nav-link--product-lite {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0;
  position: relative;
  min-height: 44px;
  padding: 8px 11px;
  font-size: 0.84rem;
  font-weight: 500;
  color: rgba(255,255,255,0.56);
}

.nav-products-row .nav-link--product[data-page="analytics"] {
  font-size: 0.84rem;
  font-weight: 500;
}

.nav-products-row .nav-link--product:not(:first-child),
.nav-products-row .nav-link--product-lite:not(:first-child) {
  margin-left: 2px;
  padding-left: 13px;
  border-left: 1px solid rgba(255,255,255,0.14);
}

:root[data-theme="light"] .nav-products-row .nav-link--product:not(:first-child),
:root[data-theme="light"] .nav-products-row .nav-link--product-lite:not(:first-child) {
  border-left-color: rgba(15,23,42,0.12);
}

.nav-products-row .nav-suite-favicon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  display: block;
  object-fit: contain;
}

/* Separator before secondary nav cluster */
.nav-item--sep-left {
  margin-left: 14px;
  padding-left: 14px;
  border-left: 1px solid rgba(255,255,255,0.14);
  position: relative;
}

:root[data-theme="light"] .nav-item--sep-left {
  border-left-color: rgba(15,23,42,0.14);
}

.nav-item--sep-left::before { display: none; }

/* Hidden items (About) — kept in DOM for link wiring */
.nav-item--hidden {
  display: none !important;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  color: rgba(255,255,255,0.56);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.88rem;
  border-radius: 8px;
  position: relative;
  background: transparent;
  border: none;
  box-shadow: none;
  transition: color 0.18s ease, background 0.18s ease;
  white-space: nowrap;
  overflow: visible;
  line-height: 1.15;
}

.nav-link i,
.nav-link svg {
  flex-shrink: 0;
}

.nav-link i {
  font-size: 0.82rem;
  line-height: 1;
}

.nav-link::before {
  display: none;
}

.nav-link:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.05);
  transform: none;
  box-shadow: none;
}

.nav-link.active {
  color: #ffffff;
  font-weight: 600;
  background: transparent;
  border: none;
  box-shadow: none;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 5px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgb(255,165,120), rgba(120,200,255,0.95));
}

.nav-products-row .nav-link--product:hover,
.nav-products-row .nav-link--product-lite:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.05);
}

.nav-products-row .nav-link--product.active,
.nav-products-row .nav-link--product-lite.active {
  color: #ffffff;
  font-weight: 600;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.nav-products-row .nav-link.active::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 5px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgb(255,165,120), rgba(120,200,255,0.95));
}

:root[data-theme="light"] .nav-logo { background: none; }

:root[data-theme="light"] .nav-link {
  color: rgba(15, 23, 42, 0.56);
}

:root[data-theme="light"] .nav-link:hover {
  color: rgba(15, 23, 42, 0.92);
  background: rgba(15, 23, 42, 0.05);
}

:root[data-theme="light"] .nav-products-row .nav-link--product,
:root[data-theme="light"] .nav-products-row .nav-link--product-lite {
  color: rgba(15, 23, 42, 0.56);
}

:root[data-theme="light"] .nav-products-row .nav-link--product:hover,
:root[data-theme="light"] .nav-products-row .nav-link--product-lite:hover,
:root[data-theme="light"] .nav-products-row .nav-link--product.active,
:root[data-theme="light"] .nav-products-row .nav-link--product-lite.active {
  color: rgba(15, 23, 42, 0.95);
}

:root[data-theme="light"] .nav-link.active {
  color: #0f172a;
  background: transparent;
  border: none;
  box-shadow: none;
}

:root[data-theme="light"] .nav-link-tag {
  border-color: rgba(180, 83, 9, 0.3);
  background: rgba(180, 83, 9, 0.1);
  color: rgba(146, 64, 14, 0.96);
}

/* Product link classes — layout only; visual state comes from .nav-link */
.nav-link--product,
.nav-link--product-lite {
  font-weight: inherit;
  border: none;
  background: transparent;
  box-shadow: none;
  color: inherit;
}

/* ── Analytics animated icon ── */
.ai-icon {
  overflow: visible;
  fill: currentColor;
  flex-shrink: 0;
  display: block;
}
.ai-b {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: aiBg 2.4s ease-in-out infinite;
}
.ai-b1 { animation-delay: 0.00s; }
.ai-b2 { animation-delay: 0.30s; }
.ai-b3 { animation-delay: 0.60s; }
.ai-b4 { animation-delay: 0.90s; }
@keyframes aiBg {
  0%,100% { transform: scaleY(0.07); opacity: 0.22; }
  40%,55% { transform: scaleY(1);    opacity: 0.90; }
}
.ai-dot {
  animation: aiDot 2.4s ease-in-out infinite;
}
@keyframes aiDot {
  0%    { transform: translate(2.25px, 11px); }
  25%   { transform: translate(6.05px,  4px); }
  50%   { transform: translate(9.85px,  1px); }
  75%   { transform: translate(13.65px, 5px); }
  100%  { transform: translate(2.25px,  11px); }
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
  opacity: 1;
  width: 190px;
  height: 46px;
}

.sticky-nav.scrolled .nav-logo-svg {
  width: 190px;
  height: 60px;
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
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 10px;
    margin-top: 6px;
    width: 100%;
  }

  .nav-products-row {
    flex-direction: column;
    width: 100%;
    gap: 4px;
  }

  .nav-products-row .nav-link--product:not(:first-child),
  .nav-products-row .nav-link--product-lite:not(:first-child) {
    margin-left: 0;
    padding-left: 11px;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 10px;
    margin-top: 2px;
  }

  .nav-products-row > .nav-link {
    width: 100%;
    min-height: 44px;
    padding: 12px 16px;
    font-size: 0.95rem;
    justify-content: center;
  }

  .nav-item--sep-left {
    margin-left: 0;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 10px;
    margin-top: 6px;
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
        <a href="javascript:void(0)" id="footer-link-analytics">Statistico-Analytics-Suite™</a>
        <a href="javascript:void(0)" id="footer-link-calculators">Statistico-Calculators-Hub™</a>
        <a href="javascript:void(0)" id="footer-link-addins">Statistico-Applications-Hub™</a>
      </div>
      <div class="footer-section">
        <h4>Resources</h4>
        <a href="javascript:void(0)" id="footer-link-why">The Paradigm</a>
        <a href="javascript:void(0)" id="footer-link-how">How It Works</a>
        <a href="javascript:void(0)" id="footer-link-faq">FAQ</a>
      </div>
      <div class="footer-section">
        <h4>Company</h4>
        <a href="javascript:void(0)" id="footer-link-about">About Us</a>
        <a href="javascript:void(0)" id="footer-link-contact">Contact</a>
        <a href="javascript:void(0)" id="footer-link-terms">Terms & Conditions</a>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Statistico™ Platform. Revolutionizing statistical computing, one analysis at a time.</div>
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
  let styleEl = document.getElementById('statistico-shared-nav-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'statistico-shared-nav-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = NAV_STYLE;

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
    const footerFaqLink = document.getElementById('footer-link-faq');
    const footerAboutLink = document.getElementById('footer-link-about');
    const footerContactLink = document.getElementById('footer-link-contact');
    const footerTermsLink = document.getElementById('footer-link-terms');
    const footerAddinsLink = document.getElementById('footer-link-addins');

    if (footerAnalyticsLink) footerAnalyticsLink.href = links.analytics;
    if (footerCalculatorsLink) footerCalculatorsLink.href = links.calculators;
    if (footerWhyLink) footerWhyLink.href = links.why;
    if (footerHowLink) footerHowLink.href = links.how;
    if (footerFaqLink) footerFaqLink.href = links.faq;
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
    const footerFaqLink = document.getElementById('footer-link-faq');
    if (footerFaqLink) footerFaqLink.href = links.faq;
    document.getElementById('link-calculators').href = links.calculators;
    document.getElementById('link-analytics').href = links.analytics;
    document.getElementById('link-addins').href = links.addins;
    document.getElementById('link-about').href = links.about;
    document.getElementById('link-contact').href = links.contact;

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

    let activePage = 'home';
    if (currentFile === 'index.html' || currentFile === '' || currentPath === '/' || currentPath.endsWith('/Statistico-Website/')) {
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


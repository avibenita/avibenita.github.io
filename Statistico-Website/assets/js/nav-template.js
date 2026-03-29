/**
 * Navigation Template - Inline approach (no fetch required)
 */

// Navigation links - dynamically adjusted based on page location
function getNavLinks() {
  return {
    home: '/index.html',
    why: '/Statistico-Website/why-another-package.html',
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
          <i class="fa-solid fa-home" style="margin-right: 8px;"></i>
          Home
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="why" id="link-why">
          Why Statistico?
        </a>
      </li>
      <li class="nav-item nav-item--product-start">
        <a href="javascript:void(0)" class="nav-link nav-link--product nav-link--product-lite" data-page="calculators" id="link-calculators">
          <span>Calculators Hub</span>
          <span class="nav-link-tag">Product</span>
        </a>
      </li>
      <li class="nav-item nav-item--product-core">
        <a href="javascript:void(0)" class="nav-link nav-link--product nav-link--product-core" data-page="analytics" id="link-analytics">
          <span>Analytics Suite</span>
          <span class="nav-link-tag">Product</span>
        </a>
      </li>
      <li class="nav-item nav-item--product-end">
        <a href="javascript:void(0)" class="nav-link nav-link--product nav-link--product-lite" data-page="addins" id="link-addins">
          <span>Add-ins</span>
          <span class="nav-link-tag">Product</span>
        </a>
      </li>
      <li class="nav-item nav-item--after-products">
        <a href="javascript:void(0)" class="nav-link" data-page="support" id="link-support">
          <i class="fa-solid fa-life-ring" style="margin-right: 8px;"></i>
          Support
        </a>
      </li>
    </ul>

    <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle color theme" aria-pressed="false" title="Toggle dark/light">
      <span class="theme-mode-icon" aria-hidden="true">
        <i class="fa-solid fa-moon"></i>
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
        <a href="javascript:void(0)" id="footer-link-addins">Excel Add‑ins</a>
      </div>
      <div class="footer-section">
        <h4>Resources</h4>
        <a href="javascript:void(0)" id="footer-link-why">Why Statistico?</a>
        <a href="#" onclick="alert('Coming soon!')">Documentation</a>
        <a href="#" onclick="alert('Coming soon!')">Video Demos</a>
        <a href="javascript:void(0)" id="footer-link-support">Support</a>
      </div>
      <div class="footer-section">
        <h4>Company</h4>
        <a href="#" onclick="alert('Coming soon!')">About Us</a>
        <a href="#" onclick="alert('Coming soon!')">Our Mission</a>
        <a href="#" onclick="alert('Coming soon!')">Contact</a>
        <a href="#" onclick="alert('Coming soon!')">Terms & Conditions</a>
      </div>
      <div class="footer-section">
        <h4>Connect</h4>
        <a href="#" onclick="alert('Coming soon!')">LinkedIn</a>
        <a href="#" onclick="alert('Coming soon!')">Twitter</a>
        <a href="#" onclick="alert('Coming soon!')">YouTube</a>
        <a href="#" onclick="alert('Coming soon!')">Research Blog</a>
        <a href="#" onclick="alert('Coming soon!')">Newsletter</a>
      </div>
    </div>
    <div class="footer-bottom">© 2025 Statistico™ Interactive Suite. Revolutionizing statistical computing, one analysis at a time.</div>
  </div>
</footer>
`;

// Load components immediately (no fetch required)
(function() {
  'use strict';

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
    const footerAddinsLink = document.getElementById('footer-link-addins');
    const footerSupportLink = document.getElementById('footer-link-support');
    
    if (footerHomeLink) footerHomeLink.href = links.home;
    if (footerWhyLink) footerWhyLink.href = links.why;
    if (footerAddinsLink) footerAddinsLink.href = links.addins;
    if (footerSupportLink) footerSupportLink.href = links.support;
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
    document.getElementById('link-calculators').href = links.calculators;
    document.getElementById('link-analytics').href = links.analytics;
    document.getElementById('link-addins').href = links.addins;
    document.getElementById('link-support').href = links.support;

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
  }

})();


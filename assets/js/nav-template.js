/**
 * Navigation Template - Inline approach (no fetch required)
 */

// Navigation links - dynamically adjusted based on page location
function getNavLinks() {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  
  // Determine if we're in a subfolder
  let isInSubfolder = false;
  if (currentFile === 'index-Calculators.html' || 
      currentFile === 'index-Analytics.html' || 
      currentFile === 'index-Addins.html' ||
      currentPath.includes('Support/')) {
    isInSubfolder = true;
  }
  
  const basePath = isInSubfolder ? '../' : '';
  
  return {
    home: basePath + 'index.html',
    why: basePath + 'why-another-package.html',
    calculators: basePath + 'Statstico-Calculators-Hub™/index-Calculators.html',
    analytics: basePath + 'Statstico-Analytics™/index-Analytics.html',
    addins: basePath + 'Statstico-Addins/index-Addins.html',
    support: basePath + 'Support/index.html'
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
          <i class="fa-solid fa-question-circle" style="margin-right: 8px;"></i>
          Why Another Package?
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="calculators" id="link-calculators">
          <i class="fa-solid fa-calculator" style="margin-right: 8px;"></i>
          Statistico-Calculators-Hub™
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="analytics" id="link-analytics">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style="margin-right: 8px;">
            <path d="M4 40 Q10 36 14 28 Q18 20 20 14 Q22 8 24 6 Q26 8 28 14 Q30 20 34 28 Q38 36 44 40"
                  stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <line x1="4" y1="40" x2="44" y2="40" stroke="currentColor" stroke-width="2"/>
            <line x1="24" y1="6" x2="24" y2="40" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4"/>
          </svg>
          Statistico-Analytics™
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="addins" id="link-addins">
          <i class="fa-regular fa-file-excel" style="margin-right: 8px;"></i>
          Statistico-Addins
        </a>
      </li>
      <li class="nav-item">
        <a href="javascript:void(0)" class="nav-link" data-page="support" id="link-support">
          <i class="fa-solid fa-life-ring" style="margin-right: 8px;"></i>
          Support
        </a>
      </li>
    </ul>

    <button class="mobile-toggle" id="mobileToggle" aria-label="Toggle mobile menu">
      <i class="fa-solid fa-bars"></i>
    </button>
  </div>
</nav>
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
        <a href="javascript:void(0)" id="footer-link-why">Why Another Package?</a>
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

  // Insert navigation
  const navPlaceholder = document.getElementById('nav-placeholder');
  if (navPlaceholder) {
    navPlaceholder.innerHTML = NAV_TEMPLATE;
    initializeNavigation();
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
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';
    
    // Determine which page we're on
    let activePage = 'home';
    if (currentFile === 'index.html' && currentPath.includes('index.html')) {
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


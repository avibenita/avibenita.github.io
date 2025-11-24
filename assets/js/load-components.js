/**
 * Statistico™ Component Loader
 * Loads shared navigation and footer components
 */

(function() {
  'use strict';

  // Get the base path dynamically
  function getBasePath() {
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 1;
    return depth > 0 ? '../'.repeat(depth) : './';
  }

  // Load Navigation
  function loadNavigation() {
    const basePath = getBasePath();
    fetch(basePath + 'assets/components/nav.html')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load navigation');
        return response.text();
      })
      .then(html => {
        document.getElementById('nav-placeholder').innerHTML = html;
        initializeNavigation();
      })
      .catch(error => console.error('Error loading navigation:', error));
  }

  // Load Footer
  function loadFooter() {
    const basePath = getBasePath();
    fetch(basePath + 'assets/components/footer.html')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load footer');
        return response.text();
      })
      .then(html => {
        document.getElementById('footer-placeholder').innerHTML = html;
      })
      .catch(error => console.error('Error loading footer:', error));
  }

  // Initialize Navigation Functionality
  function initializeNavigation() {
    const stickyNav = document.getElementById('stickyNav');
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    // Mobile menu toggle
    if (mobileToggle && navMenu) {
      mobileToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
      });
    }

    // Set active page
    setActivePage();

    // Scroll effect for sticky nav
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 100) {
        stickyNav.classList.add('scrolled');
      } else {
        stickyNav.classList.remove('scrolled');
      }

      lastScrollTop = scrollTop;
    });

    // Active link highlight for internal anchors
    const sections = document.querySelectorAll('section[id]');
    const navLinksInternal = document.querySelectorAll('a[href^="#"]');

    if (sections.length > 0 && navLinksInternal.length > 0) {
      window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.clientHeight;
          if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
          }
        });

        navLinksInternal.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
          }
        });
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            // Close mobile menu if open
            if (navMenu) {
              navMenu.classList.remove('active');
            }
          }
        }
      });
    });
  }

  // Set active page based on current URL
  function setActivePage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const linkPath = new URL(link.href).pathname;
      
      // Check if current page matches link
      if (currentPath === linkPath || 
          (currentPath === '/' && linkPath.includes('index.html')) ||
          (currentPath.includes('index.html') && linkPath === '/')) {
        link.classList.add('active');
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadNavigation();
      loadFooter();
    });
  } else {
    loadNavigation();
    loadFooter();
  }

})();


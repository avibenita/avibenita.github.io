/**
 * Hero Module JavaScript
 * Handles hero section functionality including smooth scrolling
 */

class HeroModule {
  constructor(options = {}) {
    this.options = {
      ctaSelector: '.cta-secondary',
      smoothScroll: true,
      debug: false,
      ...options
    };
    
    this.init();
  }

  init() {
    this.setupSmoothScroll();
    this.setupCTAHandlers();
    
    if (this.options.debug) {
      console.log('Hero module initialized');
    }
  }

  setupSmoothScroll() {
    // Smooth scroll for all anchor links in hero
    const heroLinks = document.querySelectorAll('.hero a[href^="#"]');
    
    heroLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        if (this.options.debug) {
          console.log('Hero link clicked:', link.getAttribute('href'));
        }
        
        const href = link.getAttribute('href');
        if (href === "#") return;
        
        const target = document.querySelector(href);
        if (!target) return;
        
        e.preventDefault();
        
        if (this.options.smoothScroll) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        } else {
          target.scrollIntoView();
        }
      });
    });
  }

  setupCTAHandlers() {
    const ctaButtons = document.querySelectorAll(this.options.ctaSelector);
    
    ctaButtons.forEach(button => {
      // Add specific handler for CTA buttons
      button.addEventListener('click', (e) => {
        if (this.options.debug) {
          console.log('CTA button clicked:', button);
        }
        
        // Add any additional CTA-specific logic here
        this.onCTAClick(button, e);
      });
    });
  }

  onCTAClick(button, event) {
    // Override this method for custom CTA behavior
    if (this.options.debug) {
      console.log('CTA clicked, executing default behavior');
    }
  }

  // Method to update hero content dynamically
  updateContent(content) {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    if (content.title) {
      const titleElement = hero.querySelector('h1 .goldish');
      if (titleElement) titleElement.textContent = content.title;
    }

    if (content.subtitle) {
      const subtitleElement = hero.querySelector('#hero-subtitle');
      if (subtitleElement) subtitleElement.textContent = content.subtitle;
    }

    if (content.description) {
      const descElement = hero.querySelector('#hero-description');
      if (descElement) descElement.textContent = content.description;
    }

    if (content.ctaText) {
      const ctaElement = hero.querySelector('#hero-cta');
      if (ctaElement) {
        const textNode = ctaElement.childNodes[ctaElement.childNodes.length - 1];
        if (textNode) textNode.textContent = ' ' + content.ctaText;
      }
    }

    if (content.ctaLink) {
      const ctaElement = hero.querySelector('#hero-cta');
      if (ctaElement) ctaElement.setAttribute('href', content.ctaLink);
    }
  }

  // Method to change hero theme
  setTheme(theme) {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Remove existing theme classes
    hero.classList.remove('bright', 'dark', 'grid');
    
    // Add new theme
    if (theme && theme !== 'default') {
      hero.classList.add(theme);
    }
  }

  // Method to destroy the module
  destroy() {
    // Remove event listeners if needed
    // This is useful for single-page applications
  }
}

// Auto-initialize if DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if hero exists on page
  if (document.querySelector('.hero')) {
    window.heroModule = new HeroModule({
      debug: false // Set to true for debugging
    });
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeroModule;
}

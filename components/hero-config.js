/**
 * Hero Module Configuration
 * Customize hero content for different pages
 */

const HeroConfigs = {
  // Default/Home page configuration
  home: {
    title: "Statistico™",
    subtitle: "Interactive Statistical Suite",
    description: "Say goodbye to dull, static statistical packages...",
    ctaText: "Explore the Suite",
    ctaLink: "#products",
    beforeImage: {
      src: "demos/24-09-2025 7-13-09 PM.gif",
      alt: "Static Analysis Demo"
    },
    afterImage: {
      src: "demos/Animation.gif", 
      alt: "Interactive Analysis Demo"
    },
    theme: "bright grid"
  },

  // Calculators Hub page
  calculators: {
    title: "Statistico™",
    subtitle: "Calculators Hub",
    description: "Interactive distribution, sample-size & power calculators with advanced simulation solutions...",
    ctaText: "Try Calculators",
    ctaLink: "#calculators",
    beforeImage: {
      src: "demos/static-calculator.gif",
      alt: "Static Calculator Demo"
    },
    afterImage: {
      src: "demos/interactive-calculator.gif",
      alt: "Interactive Calculator Demo"
    },
    theme: "bright grid"
  },

  // Analytics page
  analytics: {
    title: "Statistico™",
    subtitle: "Analytics Suite",
    description: "Classic statistical procedures in a totally new interactive way with practical innovations...",
    ctaText: "Explore Analytics",
    ctaLink: "#analytics",
    beforeImage: {
      src: "demos/static-analysis.gif",
      alt: "Static Analysis Demo"
    },
    afterImage: {
      src: "demos/interactive-analysis.gif",
      alt: "Interactive Analysis Demo"
    },
    theme: "bright grid"
  },

  // Utilities page
  utilities: {
    title: "Statistico™",
    subtitle: "Utilities Suite",
    description: "Productivity boosters like EzPaste and Pareto-Interactive for unleashing efficiency...",
    ctaText: "View Utilities",
    ctaLink: "#utilities",
    beforeImage: {
      src: "demos/manual-export.gif",
      alt: "Manual Export Demo"
    },
    afterImage: {
      src: "demos/automated-export.gif",
      alt: "Automated Export Demo"
    },
    theme: "bright grid"
  }
};

// Function to apply configuration
function applyHeroConfig(configName) {
  const config = HeroConfigs[configName];
  if (!config) {
    console.warn(`Hero config '${configName}' not found`);
    return;
  }

  // Apply theme
  const hero = document.querySelector('.hero');
  if (hero && config.theme) {
    hero.className = `hero ${config.theme}`;
  }

  // Update content using the hero module
  if (window.heroModule) {
    window.heroModule.updateContent(config);
  }

  // Update images
  if (config.beforeImage) {
    const beforeImg = document.querySelector('.hero-image-frame:first-child img');
    if (beforeImg) {
      beforeImg.src = config.beforeImage.src;
      beforeImg.alt = config.beforeImage.alt;
    }
  }

  if (config.afterImage) {
    const afterImg = document.querySelector('.hero-image-frame:last-child img');
    if (afterImg) {
      afterImg.src = config.afterImage.src;
      afterImg.alt = config.afterImage.alt;
    }
  }
}

// Auto-detect page and apply appropriate config
document.addEventListener('DOMContentLoaded', function() {
  const path = window.location.pathname;
  let configName = 'home';

  if (path.includes('calculators')) {
    configName = 'calculators';
  } else if (path.includes('analytics')) {
    configName = 'analytics';
  } else if (path.includes('utilities')) {
    configName = 'utilities';
  }

  applyHeroConfig(configName);
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.HeroConfigs = HeroConfigs;
  window.applyHeroConfig = applyHeroConfig;
}

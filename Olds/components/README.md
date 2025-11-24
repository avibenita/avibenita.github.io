# Hero Module Documentation

## Overview
The Hero Module is a reusable component system for creating consistent hero sections across your Statistico™ website. It includes HTML structure, CSS styling, JavaScript functionality, and configuration options.

## Files Structure
```
components/
├── hero.html           # HTML template
├── hero.css            # Styling
├── hero.js             # Core functionality
├── hero-config.js      # Page-specific configurations
└── README.md           # This documentation
```

## Quick Start

### 1. Basic Implementation
Include the required files in your HTML page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Your existing head content -->
  
  <!-- Hero Module CSS -->
  <link rel="stylesheet" href="components/hero.css">
  
  <!-- Font Awesome (required for icons) -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet"/>
</head>
<body>
  <!-- Include hero HTML -->
  <div id="hero-container"></div>
  
  <!-- Your page content -->
  
  <!-- Hero Module JavaScript -->
  <script src="components/hero.js"></script>
  <script src="components/hero-config.js"></script>
  
  <script>
    // Load hero HTML
    fetch('components/hero.html')
      .then(response => response.text())
      .then(html => {
        document.getElementById('hero-container').innerHTML = html;
        
        // Apply configuration (optional)
        applyHeroConfig('home'); // or 'calculators', 'analytics', 'utilities'
      });
  </script>
</body>
</html>
```

### 2. Direct HTML Inclusion
Alternatively, copy the hero HTML directly into your page:

```html
<!-- Copy content from hero.html -->
<section class="hero bright grid" id="home" style="--grid-size:24px; --grid-major:120px;">
  <!-- Hero content here -->
</section>
```

## CSS Variables Required
The hero module depends on these CSS variables being defined in your main stylesheet:

```css
:root {
  --accent-1: #60a5fa;      /* Primary accent color */
  --accent-2: #2563eb;      /* Secondary accent color */
  --surface-0: #0c1624;     /* Page background */
  --surface-1: #132235;     /* Panel background */
  --surface-2: #162a40;     /* Deeper panel background */
  --border: #24405f;        /* Border color */
  --text-1: #eaf2ff;        /* Primary text */
  --text-2: #9db3d8;        /* Secondary text */
  --shadow-xl: 0 30px 80px rgba(0,0,0,.45); /* Shadow */
  --radius-xl: 18px;        /* Border radius */
  --radius-lg: 14px;        /* Smaller border radius */
}
```

## Configuration Options

### Pre-defined Configurations
The module includes configurations for different pages:

- **home**: Default homepage hero
- **calculators**: Calculators Hub page
- **analytics**: Analytics Suite page  
- **utilities**: Utilities Suite page

### Custom Configuration
Create custom configurations in `hero-config.js`:

```javascript
HeroConfigs.myPage = {
  title: "Statistico™",
  subtitle: "My Custom Page",
  description: "Custom description...",
  ctaText: "Get Started",
  ctaLink: "#section",
  beforeImage: {
    src: "path/to/before.gif",
    alt: "Before demo"
  },
  afterImage: {
    src: "path/to/after.gif", 
    alt: "After demo"
  },
  theme: "bright grid"
};
```

## JavaScript API

### HeroModule Class
```javascript
// Initialize with options
const hero = new HeroModule({
  ctaSelector: '.cta-secondary',  // CTA button selector
  smoothScroll: true,             // Enable smooth scrolling
  debug: false                    // Enable debug logging
});

// Update content dynamically
hero.updateContent({
  title: "New Title",
  subtitle: "New Subtitle",
  description: "New description...",
  ctaText: "New CTA Text",
  ctaLink: "#new-section"
});

// Change theme
hero.setTheme('bright grid');

// Destroy module (for SPAs)
hero.destroy();
```

### Global Functions
```javascript
// Apply predefined configuration
applyHeroConfig('calculators');

// Access configurations
console.log(HeroConfigs.home);
```

## Themes

### Available Themes
- **bright**: Light background with gradient
- **grid**: Adds grid overlay pattern
- **bright grid**: Combination of both (recommended)

### Custom Themes
Add custom themes in `hero.css`:

```css
.hero.my-theme {
  background: your-custom-background;
  /* Your custom styles */
}
```

## Responsive Design
The hero module is fully responsive with breakpoints at:
- **900px**: Stacks images vertically on tablets
- **768px**: Optimizes spacing for mobile devices

## Customization Examples

### 1. Different Images Per Page
```javascript
// In your page-specific script
document.addEventListener('DOMContentLoaded', function() {
  if (window.heroModule) {
    // Update images for this specific page
    const beforeImg = document.querySelector('.hero-image-frame:first-child img');
    const afterImg = document.querySelector('.hero-image-frame:last-child img');
    
    beforeImg.src = 'path/to/your/before-image.gif';
    afterImg.src = 'path/to/your/after-image.gif';
  }
});
```

### 2. Custom CTA Behavior
```javascript
// Override CTA click behavior
class CustomHero extends HeroModule {
  onCTAClick(button, event) {
    // Custom behavior
    console.log('Custom CTA behavior');
    
    // Track analytics
    gtag('event', 'cta_click', {
      'page': window.location.pathname
    });
    
    // Continue with default behavior
    super.onCTAClick(button, event);
  }
}

// Use custom hero
window.heroModule = new CustomHero({
  debug: true
});
```

### 3. Dynamic Content Loading
```javascript
// Load hero content from API
async function loadHeroContent(pageId) {
  try {
    const response = await fetch(`/api/hero-content/${pageId}`);
    const content = await response.json();
    
    if (window.heroModule) {
      window.heroModule.updateContent(content);
    }
  } catch (error) {
    console.error('Failed to load hero content:', error);
  }
}
```

## Browser Support
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Dependencies
- Font Awesome 6.5.2+ (for icons)
- Modern browser with CSS Grid support
- ES6+ JavaScript support

## Troubleshooting

### Common Issues

1. **Button not clickable**
   - Ensure CSS variables are defined
   - Check z-index conflicts
   - Verify JavaScript is loaded

2. **Images not loading**
   - Check image paths are correct
   - Ensure images exist in specified locations
   - Verify CORS settings for cross-origin images

3. **Styling issues**
   - Confirm hero.css is loaded after main CSS
   - Check CSS variable definitions
   - Verify no conflicting styles

### Debug Mode
Enable debug mode to troubleshoot:

```javascript
window.heroModule = new HeroModule({
  debug: true
});
```

## License
Part of the Statistico™ design system. All rights reserved.

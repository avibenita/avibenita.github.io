# Statistico™ Components

This folder contains reusable HTML components for the Statistico™ website.

## Components

### nav.html
Shared navigation bar used across all pages.
- Contains the site logo, menu items, and mobile toggle
- Automatically highlights the active page
- Responsive design with mobile menu

### footer.html
Shared footer used across all pages.
- Product links
- Resource links
- Company information
- Social media links

## Usage

### In your HTML files:

```html
<body>
  <!-- Navigation Component -->
  <div id="nav-placeholder"></div>

  <!-- Your page content here -->

  <!-- Footer Component -->
  <div id="footer-placeholder"></div>

  <!-- Component Loader (required) -->
  <script src="/assets/js/load-components.js"></script>
</body>
```

## Updating Components

To update navigation or footer across the entire site:

1. Edit the component file (`nav.html` or `footer.html`)
2. Save the file
3. All pages using the component will automatically reflect the changes

## Benefits

- **Single source of truth** - Update menu once, applies everywhere
- **Consistency** - All pages use identical navigation/footer
- **Maintainability** - Easy to add/remove menu items
- **Cleaner code** - Pages are shorter and more readable

## Files Structure

```
assets/
├── components/
│   ├── nav.html          (Navigation component)
│   ├── footer.html       (Footer component)
│   └── README.md         (This file)
└── js/
    └── load-components.js (Component loader script)
```

## Technical Details

- Components are loaded via JavaScript fetch API
- Active page detection is automatic
- Mobile menu functionality is built-in
- Scroll effects and smooth scrolling are included


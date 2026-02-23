# Office.js Setup Guide

Complete guide to deploy Statistico Analytics as an Excel add-in using GitHub Pages.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [GitHub Pages Deployment](#github-pages-deployment)
- [Manifest Configuration](#manifest-configuration)
- [Sideloading the Add-in](#sideloading-the-add-in)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## Overview

The structure supports **Office Dialog API** for full-screen results:

```
Architecture:
┌─────────────────────┐
│   Excel Taskpane    │  (narrow, 320px+)
│   - Input controls  │
│   - Configuration   │
│   - Run button      │
└──────────┬──────────┘
           │
           │ Opens Dialog API
           ▼
┌─────────────────────┐
│  Results Dialog     │  (full browser window)
│  - Full results     │
│  - Export options   │
│  - Visualizations   │
└─────────────────────┘
```

---

## Prerequisites

1. **GitHub Account**: Free account at github.com
2. **Excel**: Excel 2016 or later (Windows/Mac) or Excel Online
3. **Modern Browser**: Chrome, Edge, or Firefox
4. **Text Editor**: VS Code recommended

---

## GitHub Pages Deployment

### Step 1: Create GitHub Repository

```bash
cd C:\OfficeAddins\statistico-analytics

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "feat: initial Office.js add-in structure"

# Create repository on GitHub (via web interface)
# Then link it:
git remote add origin https://github.com/YOUR_USERNAME/statistico-analytics.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Your site will be available at:
   ```
   https://YOUR_USERNAME.github.io/statistico-analytics/
   ```

### Step 3: Verify Deployment

Visit these URLs to verify:
- Hub: `https://YOUR_USERNAME.github.io/statistico-analytics/taskpane/hub.html`
- Dialog Template: `https://YOUR_USERNAME.github.io/statistico-analytics/dialogs/results-template.html`

---

## Manifest Configuration

### Step 1: Update manifest.xml

Edit `manifest.xml` and replace all instances of:
- `YOUR_USERNAME` → Your GitHub username
- `yourusername` → Your GitHub username (lowercase)
- Generate new GUID for `<Id>` element

**Generate GUID:**
```bash
# PowerShell
[guid]::NewGuid()

# Or use online generator: https://www.guidgenerator.com/
```

### Step 2: Update URLs in manifest.xml

Replace these URLs:
```xml
<!-- Line ~30 -->
<SourceLocation DefaultValue="https://YOUR_USERNAME.github.io/statistico-analytics/taskpane/hub.html" />

<!-- Line ~80 -->
<bt:Url id="Taskpane.Url" DefaultValue="https://YOUR_USERNAME.github.io/statistico-analytics/taskpane/hub.html" />

<!-- Icon URLs -->
<IconUrl DefaultValue="https://YOUR_USERNAME.github.io/statistico-analytics/assets/icon-32.png" />
```

### Step 3: Create Icons

Create these image files in `assets/` folder:
- `icon-16.png` (16x16 pixels)
- `icon-32.png` (32x32 pixels)
- `icon-64.png` (64x64 pixels)
- `icon-80.png` (80x80 pixels)

Simple PNG images with your logo.

### Step 4: Commit and Push

```bash
git add manifest.xml assets/
git commit -m "feat: configure manifest for GitHub Pages"
git push
```

Wait 1-2 minutes for GitHub Pages to update.

---

## Sideloading the Add-in

### Windows Excel (2016+)

1. **Create Network Share** (required by Excel):
   ```
   \\YOUR_COMPUTER\AddinManifests
   ```
   Or use a local folder and share it.

2. **Copy manifest.xml**:
   - Copy `manifest.xml` to the shared folder

3. **Add to Excel**:
   - Open Excel
   - Go to **File** → **Options** → **Trust Center** → **Trust Center Settings**
   - Select **Trusted Add-in Catalogs**
   - Add your share path: `\\YOUR_COMPUTER\AddinManifests`
   - Check "Show in Menu"
   - Click **OK**

4. **Insert Add-in**:
   - Restart Excel
   - Go to **Insert** tab → **My Add-ins**
   - Select **Shared Folder**
   - Choose **Statistico Analytics**
   - Click **Add**

### Mac Excel

1. **Copy manifest.xml** to:
   ```
   /Users/{username}/Library/Containers/com.microsoft.Excel/Data/Documents/wef
   ```

2. **Restart Excel**

3. **Insert Add-in**:
   - **Insert** tab → **Add-ins** → **My Add-ins**

### Excel Online

1. **Upload manifest**:
   - Go to Excel Online
   - **Insert** → **Add-ins** → **Upload My Add-in**
   - Upload `manifest.xml`

---

## Development Workflow

### Local Development with HTTPS

GitHub Pages uses HTTPS, so test locally with HTTPS:

#### Option 1: Using npm package (webpack-dev-server)

Update `package.json`:
```json
{
  "scripts": {
    "start": "webpack serve --https --port 8080",
    "start:local": "npm start"
  }
}
```

#### Option 2: Using local HTTPS server

```bash
# Install http-server with SSL
npm install -g http-server

# Generate self-signed certificate (one-time)
npm run cert

# Start HTTPS server
http-server -S -C cert.pem -K key.pem -p 8080
```

#### Option 3: Use GitHub Pages for Testing

Just push changes and test from GitHub Pages URL.

### Testing Workflow

1. **Make changes** to code
2. **Commit and push** to GitHub
3. **Wait 1-2 minutes** for GitHub Pages to update
4. **Refresh** Excel add-in (reload taskpane)
5. **Test** new functionality

**Tip**: Use browser console for debugging:
- Right-click in taskpane → **Inspect**
- View console logs, errors, network requests

---

## Module Development

### Creating a New Module for Office.js

1. **Copy template**:
```bash
cd taskpane
mkdir my-analysis
```

2. **Create taskpane HTML** (`taskpane/my-analysis/my-analysis.html`):
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Analysis</title>
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  <link rel="stylesheet" href="../../src/shared/css/main.css" />
  <link rel="stylesheet" href="../../src/shared/css/input-panel.css" />
</head>
<body>
  <div id="app">
    <!-- Input panel -->
    <div id="inputPanel"></div>
    
    <!-- Run button -->
    <button class="btn btn-primary" id="runAnalysis">
      Run Analysis
    </button>
  </div>
  
  <script type="module">
    import { MyAnalysis } from './my-analysis.js';
    
    Office.onReady(() => {
      const module = new MyAnalysis();
      module.initialize();
      window.analysisModule = module;
    });
  </script>
</body>
</html>
```

3. **Create module JS** (`taskpane/my-analysis/my-analysis.js`):
```javascript
import { BaseAnalyticsOffice } from '../../src/shared/js/analytics/base-analytics-office.js';

export class MyAnalysis extends BaseAnalyticsOffice {
  constructor() {
    super('My Analysis', {
      dialogUrl: 'https://YOUR_USERNAME.github.io/statistico-analytics/dialogs/my-analysis-results.html'
    });
  }

  validateInputs() {
    // Validation logic
    return { valid: true, errors: [] };
  }

  async performAnalysis() {
    // Analysis logic
    return { /* results */ };
  }
}
```

4. **Create dialog page** (`dialogs/my-analysis-results.html`):
```html
<!-- Copy from results-template.html and customize -->
```

5. **Add to hub** (`taskpane/hub.html`):
```html
<div class="module-card-compact" onclick="navigateToModule('my-analysis')">
  <!-- Module card HTML -->
</div>
```

6. **Test**:
```bash
git add .
git commit -m "feat: add my-analysis module"
git push
# Wait for GitHub Pages, then test in Excel
```

---

## Troubleshooting

### Add-in Not Appearing

**Problem**: Add-in doesn't show in Excel

**Solutions**:
1. Check manifest.xml is in correct location
2. Verify trusted catalog is configured
3. Restart Excel
4. Clear Office cache:
   ```
   Windows: %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
   Mac: ~/Library/Containers/com.microsoft.Excel/Data/Library/Caches/
   ```

### Dialog Not Opening

**Problem**: Results dialog doesn't open

**Solutions**:
1. Check browser console for errors
2. Verify dialog URL is correct (HTTPS required)
3. Check sessionStorage has results data
4. Test dialog URL directly in browser

### CORS Errors

**Problem**: Cross-origin errors

**Solutions**:
1. Ensure all resources load from same domain (GitHub Pages)
2. Check manifest URLs match GitHub Pages URLs exactly
3. Use relative paths where possible

### GitHub Pages Not Updating

**Problem**: Changes not reflecting on GitHub Pages

**Solutions**:
1. Wait 2-5 minutes after push
2. Clear browser cache (Ctrl+Shift+R)
3. Check GitHub Actions tab for build status
4. Verify push was successful: `git log --oneline`

### Excel Add-in Errors

**Problem**: Office.js errors in console

**Solutions**:
1. Ensure Office.onReady() is called before any Office API usage
2. Check Office.js library is loaded (network tab)
3. Verify Excel version supports add-ins (2016+)
4. Test in Excel Online if desktop issues persist

---

## Best Practices

### 1. Always Use HTTPS
- GitHub Pages provides HTTPS automatically
- Local development needs HTTPS for Office.js

### 2. Test in Multiple Environments
- Excel Desktop (Windows)
- Excel Desktop (Mac)
- Excel Online

### 3. Handle Errors Gracefully
```javascript
try {
  await Excel.run(async (context) => {
    // Excel API calls
  });
} catch (error) {
  console.error('Error:', error);
  this.showToast('Operation failed', 'error');
}
```

### 4. Use Console Logging
```javascript
console.log('✅ Success:', data);
console.error('❌ Error:', error);
console.warn('⚠️ Warning:', message);
```

### 5. Optimize for Narrow Taskpane
- Use responsive design (320px+ width)
- Stack elements vertically
- Use smaller fonts/icons
- Minimize horizontal scrolling

---

## Quick Reference

### URLs to Update

After creating GitHub repo, update these:

1. **manifest.xml** (3 places)
2. **base-analytics-office.js** (dialog URLs)
3. **hub.html** (if any absolute URLs)
4. **README.md** (documentation links)

### File Checklist

- [ ] manifest.xml configured
- [ ] Icons created (16, 32, 64, 80px)
- [ ] GitHub Pages enabled
- [ ] URLs updated to GitHub Pages
- [ ] Taskpane hub created
- [ ] Dialog templates created
- [ ] BaseAnalyticsOffice implemented
- [ ] First module working

### Support Resources

- **Office.js Docs**: https://docs.microsoft.com/office/dev/add-ins/
- **Dialog API**: https://docs.microsoft.com/office/dev/add-ins/develop/dialog-api-in-office-add-ins
- **GitHub Pages**: https://pages.github.com/
- **This Project**: https://github.com/YOUR_USERNAME/statistico-analytics

---

**🎉 Your Office.js add-in is ready for GitHub Pages deployment!**

Follow these steps and you'll have a fully functional Excel add-in with full-screen result dialogs.

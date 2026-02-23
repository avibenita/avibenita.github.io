# Development Guide

This guide covers the development workflow, best practices, and architectural decisions for the Statistico Analytics project.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Shared Components](#shared-components)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)
- [Testing Strategy](#testing-strategy)

## Architecture Overview

### Design Principles

1. **Modularity**: Each analysis module is self-contained but extends common base classes
2. **Reusability**: Shared components (CSS, JS) minimize code duplication
3. **Consistency**: Unified UI/UX across all modules
4. **Extensibility**: Easy to add new modules using templates
5. **Maintainability**: Clear separation of concerns

### Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Custom properties (CSS variables) for theming
- **JavaScript**: ES6+ modules (no bundler required for development)
- **D3.js**: Data visualization
- **Highcharts**: Interactive charts
- **Font Awesome**: Icons

### Module Architecture

```
┌─────────────────────────────────────┐
│         BaseAnalyticsModule         │
│  (Abstract base class)              │
│  - Data handling                    │
│  - UI initialization                │
│  - VB6 communication                │
│  - Results display                  │
└─────────────────────────────────────┘
              ▲
              │ extends
              │
┌─────────────┴─────────────┬─────────────────┬──────────────┐
│                           │                 │              │
│  UnivariateAnalysis       │  Correlations   │  Regression  │
│  CorrelationsAnalysis     │  etc...         │  etc...      │
└───────────────────────────┴─────────────────┴──────────────┘
```

## Development Setup

### Prerequisites

```bash
node --version  # v16.0.0 or higher
npm --version   # v8.0.0 or higher
```

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/statistico-analytics.git
cd statistico-analytics

# Install dependencies
npm install

# Start development server
npm start
```

### IDE Setup

#### VS Code (Recommended)

Install recommended extensions:
- ESLint
- Stylelint
- Path Intellisense
- Live Server

#### Settings (.vscode/settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"],
  "files.associations": {
    "*.js": "javascript"
  }
}
```

## Project Structure

```
statistico-analytics/
├── src/
│   ├── shared/                 # Shared components
│   │   ├── css/
│   │   │   ├── main.css       # Global styles
│   │   │   ├── input-panel.css
│   │   │   └── results-popup.css
│   │   ├── js/
│   │   │   ├── core/
│   │   │   │   ├── utils.js           # Utility functions
│   │   │   │   ├── data-handler.js    # Data management
│   │   │   │   └── validation.js      # Input validation
│   │   │   ├── components/
│   │   │   │   ├── InputPanel.js      # Input panel component
│   │   │   │   └── ResultsPopup.js    # Results popup component
│   │   │   └── analytics/
│   │   │       └── base-analytics.js  # Base class
│   │   └── assets/
│   ├── modules/                # Analysis modules
│   │   ├── univariate/
│   │   │   ├── univariate.html
│   │   │   ├── univariate.js
│   │   │   └── univariate.css  # Module-specific styles only
│   │   └── [other modules]/
│   ├── hub/                    # Landing page
│   │   └── index.html
│   └── templates/              # Module templates
│       ├── module-template.html
│       └── module-template.js
├── docs/                       # Documentation
├── tests/                      # Test files
├── build/                      # Build scripts
└── .github/workflows/          # CI/CD
```

## Shared Components

### CSS Architecture

#### Variables (main.css)

```css
:root {
  --surface-0: #0c1624;
  --surface-1: #1a1f2e;
  --surface-2: #242938;
  --border: #2d3748;
  --accent-1: rgb(255, 165, 120);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.85);
}
```

#### Component CSS

- `main.css`: Core styles, layout, utilities
- `input-panel.css`: Input panel styling
- `results-popup.css`: Modal/popup styling

### JavaScript Architecture

#### Core Modules

1. **utils.js**: Pure utility functions
   ```javascript
   export function formatNumber(num, decimals = 2) { ... }
   export function columnNumberToLetter(colNum) { ... }
   ```

2. **data-handler.js**: Data management singleton
   ```javascript
   import { dataHandler } from '../core/data-handler.js';
   dataHandler.loadFromSessionStorage();
   ```

3. **validation.js**: Input validation
   ```javascript
   import { validateVariableSelection } from '../core/validation.js';
   const result = validateVariableSelection(vars, 2, 10);
   ```

#### Components

1. **InputPanel.js**: Manages data input and variable selection
2. **ResultsPopup.js**: Displays results in a modal

#### Base Class

**BaseAnalyticsModule**: Abstract base class for all modules

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-analysis-module

# Make changes
# ...

# Run tests
npm test

# Commit
git add .
git commit -m "feat: add new analysis module"

# Push
git push origin feature/new-analysis-module
```

### 2. Creating a New Module

See [Module Creation Guide](module-creation.md)

### 3. Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add entry to CHANGELOG.md
4. Create PR to `develop` branch
5. Request review
6. Address feedback
7. Merge after approval

### 4. Release Process

```bash
# Update version
npm version patch  # or minor, major

# This automatically:
# 1. Runs build
# 2. Updates package.json
# 3. Creates git tag

# Push
git push && git push --tags

# GitHub Actions creates release
```

## Best Practices

### JavaScript

1. **Use ES6+ features**
   ```javascript
   // Good
   const data = dataHandler.getVariable(varName);
   const stats = { mean, median, stdDev };
   
   // Avoid
   var data = dataHandler.getVariable(varName);
   ```

2. **Destructuring**
   ```javascript
   const { mean, median, stdDev } = calculateStats(data);
   ```

3. **Arrow functions**
   ```javascript
   array.map(item => item.value);
   ```

4. **Template literals**
   ```javascript
   const message = `Analyzed ${count} variables`;
   ```

5. **Async/await over promises**
   ```javascript
   async performAnalysis() {
     const data = await fetchData();
     return processData(data);
   }
   ```

### CSS

1. **Use CSS variables**
   ```css
   .card {
     background: var(--surface-1);
     color: var(--text-primary);
   }
   ```

2. **BEM-like naming** (when not using utilities)
   ```css
   .module-card { }
   .module-card__title { }
   .module-card--active { }
   ```

3. **Mobile-first media queries**
   ```css
   .card { width: 100%; }
   @media (min-width: 768px) {
     .card { width: 50%; }
   }
   ```

### Module Development

1. **Always extend BaseAnalyticsModule**
2. **Implement required methods**:
   - `validateInputs()`
   - `performAnalysis()`
   - `displayResults()`
3. **Use shared components** (InputPanel, ResultsPopup)
4. **Handle errors gracefully**
5. **Log important events** to console
6. **Document public APIs** with JSDoc

### Code Organization

```javascript
/**
 * Module Name Analysis
 * @module ModuleName
 */

// 1. Imports
import { BaseAnalyticsModule } from '...';

// 2. Class definition
export class ModuleAnalysis extends BaseAnalyticsModule {
  // 3. Constructor
  constructor() { }
  
  // 4. Lifecycle hooks
  onInitialize() { }
  
  // 5. Required methods
  validateInputs() { }
  performAnalysis() { }
  displayResults() { }
  
  // 6. Event handlers
  onVariableSelectionChange() { }
  
  // 7. Helper methods
  buildResultsTable() { }
}
```

## Testing Strategy

### Unit Tests

```javascript
// tests/shared/utils.test.js
import { formatNumber } from '../../src/shared/js/core/utils.js';

describe('formatNumber', () => {
  it('formats numbers to 2 decimals by default', () => {
    expect(formatNumber(3.14159)).toBe('3.14');
  });
  
  it('returns — for invalid input', () => {
    expect(formatNumber(NaN)).toBe('—');
  });
});
```

### Integration Tests

```javascript
// tests/modules/regression.test.js
import { RegressionAnalysis } from '../../src/modules/regression/regression.js';

describe('RegressionAnalysis', () => {
  let module;
  
  beforeEach(() => {
    module = new RegressionAnalysis();
  });
  
  it('validates inputs correctly', () => {
    const result = module.validateInputs();
    expect(result.valid).toBe(false);
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage

# Specific file
npm test utils.test.js
```

## Debugging

### Console Logging

Use emoji prefixes for clarity:

```javascript
console.log('🚀 Initializing module...');
console.log('📊 Data loaded:', data);
console.log('✅ Analysis completed');
console.error('❌ Error:', error);
console.warn('⚠️ Warning:', message);
```

### Browser DevTools

1. **Network tab**: Check resource loading
2. **Console**: View logs and errors
3. **Sources**: Set breakpoints
4. **Application**: Inspect sessionStorage/localStorage

### Common Issues

1. **Module not loading**: Check import paths
2. **Styles not applying**: Verify CSS variable names
3. **Data not available**: Check sessionStorage
4. **Components not rendering**: Ensure DOM is ready

## Performance Optimization

1. **Lazy load modules**: Load only when needed
2. **Debounce expensive operations**: Use `debounce()` utility
3. **Cache calculations**: Store results when possible
4. **Minimize DOM manipulation**: Batch updates
5. **Use event delegation**: For dynamic content

## Security Considerations

1. **Validate all inputs**: Never trust user input
2. **Sanitize HTML**: Use `textContent` not `innerHTML` for user data
3. **HTTPS only**: For production
4. **No inline scripts**: Use CSP-compatible code
5. **Dependency scanning**: Run `npm audit` regularly

## Next Steps

- Read [Module Creation Guide](module-creation.md)
- Explore [API Reference](api-reference.md)
- Check [Migration Guide](migration-guide.md) if migrating from old code

---

**Questions?** Open an issue on GitHub or contact the maintainers.

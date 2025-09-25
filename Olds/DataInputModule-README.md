# 📊 Data Input Module

A clean, reusable HTML/JavaScript module for efficiently importing data from Excel ranges or pasted content. Extracted from the Pareto-Interactive application and designed for easy integration into any web application.

## ✨ Features

- **Dual Input Methods**: Excel range selection or copy/paste functionality
- **Excel Add-in Compatible**: Full Office.js integration for Excel add-ins
- **Auto-parsing**: Automatically detects and parses tab-separated or comma-separated values
- **Clean API**: Simple JavaScript API for programmatic access
- **Event-driven**: Custom events for real-time data updates
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern, professional dark UI
- **Data Preview**: Built-in table preview of imported data
- **Error Handling**: Comprehensive error handling and user feedback

## 🚀 Quick Start

### Basic Integration

```html
<!-- Include the module as an iframe -->
<iframe src="DataInputModule.html" width="100%" height="600" id="dataInputFrame"></iframe>

<script>
// Wait for module to load
document.getElementById('dataInputFrame').addEventListener('load', function() {
    const moduleWindow = this.contentWindow;
    
    // Listen for data events
    moduleWindow.addEventListener('dataLoaded', function(event) {
        const { data, headers, rowCount, columnCount } = event.detail;
        console.log('Data loaded:', data);
        // Process your data here
    });
});
</script>
```

### Direct API Access

```javascript
// Access the module's API directly (same-origin only)
const moduleWindow = document.getElementById('dataInputFrame').contentWindow;
const dataModule = moduleWindow.DataInputModule;

// Get current data
const data = dataModule.getData();
const headers = dataModule.getHeaders();

// Check if data is available
if (dataModule.hasData()) {
    console.log('Data available:', dataModule.getDataInfo());
}
```

## 📋 API Reference

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getData()` | Array | Returns the parsed data array |
| `getHeaders()` | Array | Returns the column headers array |
| `getDataInfo()` | Object | Returns complete data information object |
| `hasData()` | Boolean | Returns true if data is loaded |
| `setData(data, headers)` | void | Set data programmatically |
| `clear()` | void | Clear all data |
| `loadDemo()` | void | Load demo data for testing |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `dataLoaded` | `{data, headers, rowCount, columnCount}` | Fired when data is successfully loaded |
| `dataCleared` | `{}` | Fired when data is cleared |

### Data Format

The module returns data in the following format:

```javascript
// Headers array
headers = ["Product", "Region", "Sales", "Quarter"]

// Data array (array of objects)
data = [
    { "Product": "Widget A", "Region": "North", "Sales": "1500", "Quarter": "Q1" },
    { "Product": "Widget B", "Region": "South", "Sales": "2300", "Quarter": "Q1" },
    // ... more rows
]

// Data info object
dataInfo = {
    data: [...],           // Full data array
    headers: [...],        // Headers array
    rowCount: 10,         // Number of data rows
    columnCount: 4        // Number of columns
}
```

## 🔧 Usage Examples

### Example 1: Basic Data Processing

```html
<iframe src="DataInputModule.html" id="dataInput"></iframe>

<script>
document.getElementById('dataInput').addEventListener('load', function() {
    const module = this.contentWindow.DataInputModule;
    
    // Listen for data updates
    this.contentWindow.addEventListener('dataLoaded', function(event) {
        const { data, headers } = event.detail;
        
        // Process the data
        processData(data, headers);
    });
});

function processData(data, headers) {
    // Example: Calculate totals for numeric columns
    const numericColumns = headers.filter(header => 
        data.every(row => !isNaN(parseFloat(row[header])))
    );
    
    numericColumns.forEach(column => {
        const total = data.reduce((sum, row) => sum + parseFloat(row[column] || 0), 0);
        console.log(`Total ${column}: ${total}`);
    });
}
</script>
```

### Example 2: Excel Add-in Integration

```javascript
// In your Excel add-in
Office.onReady((info) => {
    if (info.host === Office.HostType.Excel) {
        // Module will automatically detect Excel context
        console.log('Excel add-in mode enabled');
    }
});

// The module handles Excel.run() calls automatically
// Users can select ranges directly in Excel and click "Get Selection"
```

### Example 3: Programmatic Data Setting

```javascript
const moduleWindow = document.getElementById('dataInput').contentWindow;
const module = moduleWindow.DataInputModule;

// Set data programmatically
const customData = [
    { Name: "John", Age: "25", Department: "Sales" },
    { Name: "Jane", Age: "30", Department: "Marketing" }
];
const customHeaders = ["Name", "Age", "Department"];

module.setData(customData, customHeaders);
```

## 🎨 Styling and Customization

The module uses CSS custom properties for easy theming:

```css
:root {
    --surface-0: #0c1624;      /* Page background */
    --surface-1: #1a1f2e;      /* Panel background */
    --surface-2: #242938;      /* Input backgrounds */
    --border: #2d3748;         /* Border color */
    --accent-1: rgb(255,165,120); /* Primary accent (orange) */
    --accent-2: rgb(120,200,255); /* Secondary accent (blue) */
    --text-primary: #ffffff;    /* Primary text */
    --text-secondary: rgba(255,255,255,0.8); /* Secondary text */
    --text-muted: rgba(255,255,255,0.6);     /* Muted text */
}
```

## 📱 Responsive Design

The module is fully responsive and adapts to different screen sizes:

- **Desktop**: Full two-column layout with side-by-side controls
- **Tablet**: Stacked layout with optimized spacing
- **Mobile**: Single-column layout with touch-friendly controls

## 🔒 Security Considerations

- **Same-Origin Policy**: Direct API access requires same-origin
- **Excel Add-ins**: Office.js provides secure Excel integration
- **Data Validation**: Input validation prevents malformed data
- **No External Dependencies**: Self-contained with no external API calls

## 🧪 Testing

Use the included test page (`DataInputModuleTest.html`) to:

- Test the module functionality
- See real-time data output
- View integration examples
- Monitor events and API calls

```bash
# Open the test page in your browser
open DataInputModuleTest.html
```

## 📦 File Structure

```
DataInputModule.html           # Main module file
DataInputModuleTest.html      # Test and demo page
DataInputModule-README.md     # This documentation
```

## 🔄 Integration Patterns

### Pattern 1: Iframe Embedding
```html
<iframe src="DataInputModule.html" width="100%" height="600"></iframe>
```
**Pros**: Easy integration, isolated styling
**Cons**: Cross-origin limitations

### Pattern 2: Direct Inclusion
```html
<!-- Include module content directly in your page -->
<div id="dataInputContainer">
    <!-- Module HTML content here -->
</div>
```
**Pros**: Full API access, no cross-origin issues
**Cons**: Potential styling conflicts

### Pattern 3: Web Component
```javascript
// Future enhancement: Convert to web component
<data-input-module></data-input-module>
```

## 🐛 Troubleshooting

### Common Issues

**Q: Excel range selection not working**
A: Ensure the module is running in an Excel add-in context with Office.js loaded.

**Q: Data not parsing correctly**
A: Check that your data has headers in the first row and uses consistent delimiters (tab or comma).

**Q: API methods not accessible**
A: Verify same-origin policy compliance or use the event-driven approach.

**Q: Styling conflicts**
A: Use iframe embedding to isolate styles, or customize CSS custom properties.

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('dataInputDebug', 'true');
// Reload the module
```

## 🚀 Future Enhancements

- [ ] Web Component version
- [ ] TypeScript definitions
- [ ] Additional file format support (CSV, JSON, XML)
- [ ] Data transformation pipelines
- [ ] Custom validation rules
- [ ] Undo/redo functionality
- [ ] Bulk data operations

## 📄 License

This module is extracted from the Pareto-Interactive application and provided as-is for reuse in other projects.

## 🤝 Contributing

To contribute improvements:

1. Test thoroughly with the included test page
2. Maintain backward compatibility
3. Update documentation
4. Ensure responsive design works across devices

---

**Created by**: Avi Benita  
**Extracted from**: Pareto-Interactive™ Application  
**Version**: 1.0  
**Last Updated**: September 2025

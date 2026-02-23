/**
 * Module Name Analysis
 * [Brief description of what this analysis module does]
 * 
 * @module ModuleNameAnalysis
 * @extends BaseAnalyticsModule
 */

import { BaseAnalyticsModule } from '../../shared/js/analytics/base-analytics.js';
import { dataHandler } from '../../shared/js/core/data-handler.js';
import { 
  validateVariableSelection, 
  validateNumericData 
} from '../../shared/js/core/validation.js';
import { 
  formatNumber, 
  calculateDescriptiveStats 
} from '../../shared/js/core/utils.js';

export class ModuleNameAnalysis extends BaseAnalyticsModule {
  constructor() {
    super('Module Name', {
      inputPanelId: 'inputPanel',
      errorContainerId: 'errorContainer',
      showResultsInPopup: true,
      enableVB6Communication: true
    });
    
    // Module-specific properties
    this.analysisOptions = {
      option1: null,
      option2: 'choice1'
    };
  }

  /**
   * Module-specific initialization
   */
  onInitialize() {
    console.log('Initializing Module Name Analysis...');
    
    // Load any module-specific settings
    this.loadAnalysisOptions();
    
    // Setup module-specific event listeners
    this.setupModuleEventListeners();
  }

  /**
   * Setup module-specific event listeners
   */
  setupModuleEventListeners() {
    // Option 1 change
    const option1Input = document.getElementById('option1');
    if (option1Input) {
      option1Input.addEventListener('change', (e) => {
        this.analysisOptions.option1 = e.target.value;
      });
    }

    // Option 2 change
    const option2Select = document.getElementById('option2');
    if (option2Select) {
      option2Select.addEventListener('change', (e) => {
        this.analysisOptions.option2 = e.target.value;
      });
    }
  }

  /**
   * Load analysis options from localStorage or defaults
   */
  loadAnalysisOptions() {
    try {
      const saved = localStorage.getItem('modulename_options');
      if (saved) {
        this.analysisOptions = { ...this.analysisOptions, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load saved options:', e);
    }
  }

  /**
   * Save analysis options to localStorage
   */
  saveAnalysisOptions() {
    try {
      localStorage.setItem('modulename_options', JSON.stringify(this.analysisOptions));
    } catch (e) {
      console.warn('Could not save options:', e);
    }
  }

  /**
   * Configure input panel
   * @override
   */
  getInputPanelConfig() {
    return {
      showDataOptions: true,
      allowMultipleSelection: true,
      minSelection: 2, // Require at least 2 variables
      maxSelection: 10  // Maximum 10 variables
    };
  }

  /**
   * Configure dropdown options for further analysis
   * @override
   */
  getDropdownOptions() {
    return [
      { value: 'descriptive-stats', label: 'Descriptive Statistics', icon: 'fa fa-chart-bar' },
      { value: 'correlations', label: 'Correlations', icon: 'fa fa-link' },
      { value: 'regression', label: 'Regression Analysis', icon: 'fa fa-chart-line' },
      { value: 'univariate', label: 'Univariate Analysis', icon: 'fa fa-chart-pie' }
    ];
  }

  /**
   * Validate inputs before running analysis
   * @override
   * @returns {Object} Validation result
   */
  validateInputs() {
    const errors = [];
    
    // Validate variable selection
    const selectedVars = this.inputPanel.getSelectedVariables();
    const varValidation = validateVariableSelection(selectedVars, 2, 10);
    if (!varValidation.valid) {
      errors.push(...varValidation.errors);
    }

    // Validate data exists
    if (!dataHandler.rawData || dataHandler.rawData.length === 0) {
      errors.push('No data available. Please load data first.');
    }

    // Validate each variable has numeric data
    if (selectedVars.length > 0) {
      selectedVars.forEach(varName => {
        const data = dataHandler.getVariable(varName);
        const dataValidation = validateNumericData(data, { minLength: 2 });
        if (!dataValidation.valid) {
          errors.push(`Invalid data for ${varName}: ${dataValidation.message}`);
        }
      });
    }

    // Validate module-specific options
    if (this.analysisOptions.option1 === null || this.analysisOptions.option1 === '') {
      errors.push('Please provide a value for Option 1');
    }

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : 'Validation passed',
      errors
    };
  }

  /**
   * Perform the analysis
   * @override
   * @returns {Promise<Object>} Analysis results
   */
  async performAnalysis() {
    console.log('▶️ Starting analysis...');
    
    // Get selected variables and their data
    const selectedVars = this.inputPanel.getSelectedVariables();
    const data = {};
    
    selectedVars.forEach(varName => {
      data[varName] = dataHandler.getVariable(varName);
    });

    // Save current options
    this.saveAnalysisOptions();

    // Perform your analysis here
    // This is where you implement the actual statistical calculations
    
    // Example: Calculate descriptive statistics for each variable
    const descriptiveStats = {};
    selectedVars.forEach(varName => {
      descriptiveStats[varName] = calculateDescriptiveStats(data[varName]);
    });

    // Simulate async operation (remove in real implementation)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return results object
    return {
      variables: selectedVars,
      data: data,
      descriptiveStats: descriptiveStats,
      options: this.analysisOptions,
      timestamp: new Date().toISOString()
      // Add your analysis results here
    };
  }

  /**
   * Display analysis results
   * @override
   * @param {Object} results - Analysis results
   */
  displayResults(results) {
    console.log('📊 Displaying results:', results);

    if (!this.resultsPopup) {
      console.error('Results popup not initialized');
      return;
    }

    // Set title
    this.resultsPopup.setTitle(`${this.moduleName} Results`);

    // Build results HTML
    let resultsHTML = '<div class="results-container">';

    // Summary section
    resultsHTML += this.buildSummarySection(results);

    // Detailed results section
    resultsHTML += this.buildDetailedResultsSection(results);

    resultsHTML += '</div>';

    // Set content and open popup
    this.resultsPopup.setContent(resultsHTML);
    this.resultsPopup.open();

    // Store results for export
    this.results = results;
  }

  /**
   * Build summary section of results
   * @param {Object} results - Analysis results
   * @returns {string} HTML string
   */
  buildSummarySection(results) {
    return `
      <div class="results-section">
        <div class="results-section-title">
          <i class="fa fa-info-circle"></i>
          Analysis Summary
        </div>
        <div class="table-wrap">
          <table>
            <tr>
              <td><strong>Variables Analyzed:</strong></td>
              <td>${results.variables.length}</td>
            </tr>
            <tr>
              <td><strong>Sample Size:</strong></td>
              <td>${results.data[results.variables[0]].length}</td>
            </tr>
            <tr>
              <td><strong>Analysis Date:</strong></td>
              <td>${new Date(results.timestamp).toLocaleString()}</td>
            </tr>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Build detailed results section
   * @param {Object} results - Analysis results
   * @returns {string} HTML string
   */
  buildDetailedResultsSection(results) {
    let html = `
      <div class="results-section">
        <div class="results-section-title">
          <i class="fa fa-table"></i>
          Detailed Results
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>N</th>
                <th>Mean</th>
                <th>Std Dev</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
    `;

    results.variables.forEach(varName => {
      const stats = results.descriptiveStats[varName];
      html += `
        <tr>
          <td>${varName}</td>
          <td>${stats.n}</td>
          <td>${this.formatNumber(stats.mean)}</td>
          <td>${this.formatNumber(stats.stdDev)}</td>
          <td>${this.formatNumber(stats.min)}</td>
          <td>${this.formatNumber(stats.max)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Handle variable selection change
   * @override
   */
  onVariableSelectionChange(variables) {
    console.log('Variables selected:', variables);
    
    // Update preview if needed
    const previewContent = document.getElementById('previewContent');
    if (previewContent && variables.length > 0) {
      previewContent.innerHTML = `
        <p style="color: var(--text-primary); margin-bottom: 10px;">
          <strong>${variables.length}</strong> variable(s) selected:
        </p>
        <p style="color: var(--text-secondary);">
          ${variables.join(', ')}
        </p>
      `;
    }
  }

  /**
   * Handle further analysis selection
   * @override
   */
  onFurtherAnalysisSelect(analysisType) {
    console.log('Further analysis selected:', analysisType);
    
    // Navigate to selected analysis or implement custom behavior
    // For example: window.location.href = `../correlations/correlations.html`;
    
    // Or communicate with parent frame / VB6 to navigate
    this.sendMessageToVB6('NavigateToAnalysis', analysisType);
  }

  /**
   * Export results to CSV
   */
  exportToCSV() {
    if (!this.results) {
      alert('No results to export');
      return;
    }

    // Implement CSV export logic
    console.log('Exporting results to CSV...');
    
    // Use the downloadCSV utility from utils.js
    // downloadCSV(dataArray, 'module-name-results.csv');
  }

  /**
   * Export results to Excel (via VB6)
   */
  exportToExcel() {
    if (!this.results) {
      alert('No results to export');
      return;
    }

    console.log('Exporting results to Excel via VB6...');
    
    // Send results to VB6 for Excel export
    this.sendMessageToVB6('ExportToExcel', JSON.stringify(this.results));
  }
}

// Export for use in HTML
export default ModuleNameAnalysis;

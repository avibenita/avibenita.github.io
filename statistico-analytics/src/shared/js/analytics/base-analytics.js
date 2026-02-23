/**
 * BaseAnalyticsModule
 * Abstract base class that all statistical analysis modules extend
 * Provides common functionality for data handling, UI, and VB6 communication
 * @module base-analytics
 */

import { dataHandler } from '../core/data-handler.js';
import { InputPanel } from '../components/InputPanel.js';
import { ResultsPopup } from '../components/ResultsPopup.js';
import { formatNumber, showToast } from '../core/utils.js';
import { displayValidationErrors, clearValidationErrors } from '../core/validation.js';

export class BaseAnalyticsModule {
  /**
   * Constructor
   * @param {string} moduleName - Name of the analysis module
   * @param {Object} config - Module configuration
   */
  constructor(moduleName, config = {}) {
    this.moduleName = moduleName;
    this.config = {
      inputPanelId: 'inputPanel',
      errorContainerId: 'errorContainer',
      showResultsInPopup: true,
      enableVB6Communication: true,
      ...config
    };

    // Components
    this.inputPanel = null;
    this.resultsPopup = null;
    
    // State
    this.results = null;
    this.isProcessing = false;
    
    // Decimal places for formatting
    this.decimalPlaces = 2;
  }

  /**
   * Initialize the module - MUST be called after DOM is ready
   */
  initialize() {
    console.log(`🚀 Initializing ${this.moduleName} module...`);
    
    // Load data from sessionStorage
    dataHandler.loadFromSessionStorage();
    
    // Initialize input panel
    this.initializeInputPanel();
    
    // Initialize results popup
    if (this.config.showResultsInPopup) {
      this.initializeResultsPopup();
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Module-specific initialization
    this.onInitialize();
    
    console.log(`✅ ${this.moduleName} module initialized`);
  }

  /**
   * Initialize input panel
   */
  initializeInputPanel() {
    if (!document.getElementById(this.config.inputPanelId)) {
      console.warn(`Input panel container #${this.config.inputPanelId} not found`);
      return;
    }

    this.inputPanel = new InputPanel(this.config.inputPanelId, this.getInputPanelConfig());
    this.inputPanel.initialize();
    
    // Register callbacks
    this.inputPanel.on('onSelectionChange', (variables) => {
      this.onVariableSelectionChange(variables);
    });
    
    this.inputPanel.on('onDataOptionChange', (option) => {
      this.onDataOptionChange(option);
    });
  }

  /**
   * Initialize results popup
   */
  initializeResultsPopup() {
    this.resultsPopup = new ResultsPopup({
      title: `${this.moduleName} Results`,
      showDropdown: true,
      dropdownOptions: this.getDropdownOptions()
    });
    
    this.resultsPopup.initialize();
    
    // Register callbacks
    this.resultsPopup.on('onClose', () => {
      this.onResultsClose();
    });
    
    this.resultsPopup.on('onDropdownSelect', (analysisType) => {
      this.onFurtherAnalysisSelect(analysisType);
    });
  }

  /**
   * Setup event listeners - Override in subclass for module-specific events
   */
  setupEventListeners() {
    // Setup run analysis button
    const runBtn = document.getElementById('runAnalysis');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runAnalysis());
    }

    // Setup decimal places slider if exists
    const decimalSlider = document.getElementById('decimal-places');
    if (decimalSlider) {
      decimalSlider.addEventListener('input', (e) => {
        this.decimalPlaces = parseInt(e.target.value);
        this.onDecimalPlacesChange(this.decimalPlaces);
      });
    }

    // Listen for messages from other windows/frames
    window.addEventListener('message', (event) => {
      this.handleMessage(event);
    });
  }

  /**
   * Run the analysis - Main entry point
   */
  async runAnalysis() {
    if (this.isProcessing) {
      showToast('Analysis already in progress', 'warning');
      return;
    }

    // Clear previous errors
    const errorContainer = document.getElementById(this.config.errorContainerId);
    if (errorContainer) {
      clearValidationErrors(errorContainer);
    }

    // Validate inputs
    const validation = this.validateInputs();
    if (!validation.valid) {
      if (errorContainer) {
        displayValidationErrors(validation, errorContainer);
      }
      showToast('Please check your inputs', 'error');
      return;
    }

    try {
      this.isProcessing = true;
      
      // Show loading state
      if (this.resultsPopup) {
        this.resultsPopup.setLoading(true, 'Running analysis...');
        this.resultsPopup.open();
      }

      // Perform the analysis
      console.log(`▶️ Running ${this.moduleName} analysis...`);
      this.results = await this.performAnalysis();
      
      // Display results
      this.displayResults(this.results);
      
      console.log(`✅ ${this.moduleName} analysis completed`);
      showToast('Analysis completed successfully', 'success');
      
    } catch (error) {
      console.error(`❌ Error in ${this.moduleName} analysis:`, error);
      
      if (this.resultsPopup) {
        this.resultsPopup.showError(`Error: ${error.message}`);
      } else {
        showToast(`Error: ${error.message}`, 'error');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send message to VB6
   * @param {string} action - Action identifier
   * @param {*} data - Data to send
   */
  sendMessageToVB6(action, data = null) {
    if (!this.config.enableVB6Communication) {
      console.log('VB6 communication disabled');
      return;
    }

    console.log('📤 Sending message to VB6:', action, data ? '(with data)' : '(no data)');
    
    try {
      // Method 1: Try vbH()
      if (typeof vbH === 'function') {
        vbH().RaiseMessageEvent(action, data || '');
        console.log('✅ Message sent via vbH()');
        return;
      }
    } catch (err) {
      console.warn('⚠️ vbH() failed:', err.message);
    }
    
    try {
      // Method 2: Try window.external
      if (window.external && window.external.OrdoWebView1_JSMessage) {
        const message = data ? `${action}|${data}` : action;
        window.external.OrdoWebView1_JSMessage(message);
        console.log('✅ Message sent via window.external');
        return;
      }
    } catch (err) {
      console.warn('⚠️ window.external failed:', err.message);
    }
    
    console.error('❌ No VB6 communication method available!');
  }

  /**
   * Handle incoming messages
   * @param {MessageEvent} event - Message event
   */
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'inputsXL_selectionChanged':
        if (this.inputPanel) {
          this.inputPanel.setSelectedVariables(data.selectedVariables);
        }
        break;
      case 'vb6_response':
        this.onVB6Response(data);
        break;
      default:
        // Module-specific message handling
        this.onMessage(type, data);
    }
  }

  /**
   * Format number using current decimal places
   * @param {number} value - Number to format
   * @returns {string} Formatted number
   */
  formatNumber(value) {
    return formatNumber(value, this.decimalPlaces);
  }

  // ==================== ABSTRACT METHODS - Must be implemented by subclasses ====================

  /**
   * Get input panel configuration - Override in subclass
   * @returns {Object} Input panel configuration
   */
  getInputPanelConfig() {
    return {
      showDataOptions: true,
      allowMultipleSelection: true,
      minSelection: 1,
      maxSelection: Infinity
    };
  }

  /**
   * Get dropdown options for further analysis - Override in subclass
   * @returns {Array} Array of dropdown options
   */
  getDropdownOptions() {
    return [
      { value: 'descriptive-stats', label: 'Descriptive Statistics', icon: 'fa fa-chart-bar' },
      { value: 'correlations', label: 'Correlations', icon: 'fa fa-link' },
      { value: 'regression', label: 'Regression', icon: 'fa fa-chart-line' }
    ];
  }

  /**
   * Validate inputs before running analysis - MUST be implemented
   * @returns {Object} Validation result with {valid: boolean, errors: Array}
   */
  validateInputs() {
    throw new Error('validateInputs() must be implemented by subclass');
  }

  /**
   * Perform the actual analysis - MUST be implemented
   * @returns {Promise<Object>} Analysis results
   */
  async performAnalysis() {
    throw new Error('performAnalysis() must be implemented by subclass');
  }

  /**
   * Display analysis results - MUST be implemented
   * @param {Object} results - Analysis results
   */
  displayResults(results) {
    throw new Error('displayResults() must be implemented by subclass');
  }

  // ==================== HOOKS - Optional overrides ====================

  /**
   * Called after module initialization - Override for custom initialization
   */
  onInitialize() {
    // Override in subclass
  }

  /**
   * Called when variable selection changes
   * @param {Array} variables - Selected variables
   */
  onVariableSelectionChange(variables) {
    console.log('Variable selection changed:', variables);
  }

  /**
   * Called when data option changes
   * @param {string} option - Selected data option
   */
  onDataOptionChange(option) {
    console.log('Data option changed:', option);
  }

  /**
   * Called when decimal places change
   * @param {number} decimals - Number of decimal places
   */
  onDecimalPlacesChange(decimals) {
    console.log('Decimal places changed:', decimals);
  }

  /**
   * Called when results popup is closed
   */
  onResultsClose() {
    console.log('Results popup closed');
  }

  /**
   * Called when further analysis option is selected
   * @param {string} analysisType - Type of analysis selected
   */
  onFurtherAnalysisSelect(analysisType) {
    console.log('Further analysis selected:', analysisType);
    // Navigate to selected analysis or implement custom behavior
  }

  /**
   * Called when message is received - Override for custom message handling
   * @param {string} type - Message type
   * @param {*} data - Message data
   */
  onMessage(type, data) {
    // Override in subclass
  }

  /**
   * Called when VB6 sends a response
   * @param {*} data - Response data from VB6
   */
  onVB6Response(data) {
    // Override in subclass
    console.log('VB6 response received:', data);
  }

  /**
   * Get module state for debugging
   */
  getState() {
    return {
      moduleName: this.moduleName,
      isProcessing: this.isProcessing,
      hasResults: this.results !== null,
      dataLoaded: dataHandler.getSummary().hasData,
      selectedVariables: this.inputPanel ? this.inputPanel.getSelectedVariables() : []
    };
  }
}

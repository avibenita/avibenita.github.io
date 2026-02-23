/**
 * BaseAnalyticsOffice - Office.js Enhanced Base Class
 * Extends BaseAnalyticsModule with Office Dialog API support
 * @module base-analytics-office
 */

import { BaseAnalyticsModule } from './base-analytics.js';

export class BaseAnalyticsOffice extends BaseAnalyticsModule {
  constructor(moduleName, config = {}) {
    super(moduleName, {
      ...config,
      showResultsInPopup: false, // Disable popup, use Dialog API instead
      enableVB6Communication: false // No VB6 in Office.js
    });

    // Office.js specific properties
    this.isOfficeContext = false;
    this.dialogInstance = null;
    this.dialogUrl = config.dialogUrl || null;
  }

  /**
   * Initialize - Enhanced with Office.js detection
   * @override
   */
  initialize() {
    console.log(`🚀 Initializing ${this.moduleName} (Office.js mode)...`);
    
    // Detect Office.js context
    this.isOfficeContext = typeof Office !== 'undefined';
    
    if (this.isOfficeContext) {
      console.log('✅ Running in Office.js context');
    } else {
      console.log('ℹ️ Running in standalone mode');
    }

    // Call parent initialize
    super.initialize();
  }

  /**
   * Display results using Office Dialog API
   * @override
   * @param {Object} results - Analysis results
   */
  displayResults(results) {
    if (!this.isOfficeContext || !Office.context.ui) {
      console.warn('⚠️ Office Dialog API not available, falling back to inline display');
      this.displayResultsInline(results);
      return;
    }

    // Store results for dialog
    this.currentResults = results;
    
    // Determine dialog URL
    const dialogUrl = this.getDialogUrl();
    
    console.log('📊 Opening results dialog:', dialogUrl);
    
    // Open Office Dialog
    this.openDialog(dialogUrl, results);
  }

  /**
   * Get dialog URL for this module
   * @returns {string} Full URL to dialog page
   */
  getDialogUrl() {
    if (this.dialogUrl) {
      return this.dialogUrl;
    }

    // Construct dialog URL based on current location
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const modulePath = this.moduleName.toLowerCase().replace(/\s+/g, '-');
    
    return `${baseUrl}/../../dialogs/${modulePath}-results.html`;
  }

  /**
   * Open Office Dialog with results
   * @param {string} url - Dialog URL
   * @param {Object} results - Results to pass to dialog
   */
  openDialog(url, results) {
    const dialogOptions = {
      height: 80,    // 80% of screen height
      width: 60,     // 60% of screen width
      displayInIframe: false
    };

    Office.context.ui.displayDialogAsync(
      url,
      dialogOptions,
      (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          console.error('❌ Failed to open dialog:', asyncResult.error.message);
          this.showToast('Failed to open results window', 'error');
          
          // Fallback to inline display
          this.displayResultsInline(results);
          return;
        }

        console.log('✅ Dialog opened successfully');
        
        // Store dialog reference
        this.dialogInstance = asyncResult.value;

        // Add event handler for messages from dialog
        this.dialogInstance.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (arg) => this.handleDialogMessage(arg)
        );

        // Add event handler for dialog closed
        this.dialogInstance.addEventHandler(
          Office.EventType.DialogEventReceived,
          (arg) => this.handleDialogEvent(arg)
        );

        // Send results to dialog after a brief delay (dialog needs to load)
        setTimeout(() => {
          this.sendResultsToDialog(results);
        }, 500);
      }
    );
  }

  /**
   * Send results data to dialog
   * @param {Object} results - Results to send
   */
  sendResultsToDialog(results) {
    if (!this.dialogInstance) {
      console.warn('⚠️ No dialog instance available');
      return;
    }

    try {
      const message = {
        type: 'RESULTS_DATA',
        moduleName: this.moduleName,
        results: results,
        decimalPlaces: this.decimalPlaces,
        timestamp: new Date().toISOString()
      };

      // Office dialogs use messageParent() to receive messages
      // We can't directly send to dialog, so we store in sessionStorage
      sessionStorage.setItem('analysisResults', JSON.stringify(message));
      
      console.log('📤 Results stored for dialog');
    } catch (error) {
      console.error('❌ Error storing results:', error);
    }
  }

  /**
   * Handle messages from dialog
   * @param {Object} arg - Message argument
   */
  handleDialogMessage(arg) {
    console.log('📨 Message from dialog:', arg.message);
    
    try {
      const message = JSON.parse(arg.message);
      
      switch (message.type) {
        case 'DIALOG_READY':
          console.log('✅ Dialog is ready');
          this.sendResultsToDialog(this.currentResults);
          break;
          
        case 'EXPORT_TO_EXCEL':
          console.log('📊 Export to Excel requested');
          this.exportResultsToExcel(message.data);
          break;
          
        case 'CLOSE_DIALOG':
          console.log('❌ Close dialog requested');
          this.closeDialog();
          break;
          
        default:
          console.log('ℹ️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling dialog message:', error);
    }
  }

  /**
   * Handle dialog events (closed, navigation, etc.)
   * @param {Object} arg - Event argument
   */
  handleDialogEvent(arg) {
    console.log('🔔 Dialog event:', arg.error);
    
    if (arg.error === 12006) {
      // Dialog closed by user
      console.log('ℹ️ Dialog closed by user');
      this.onDialogClosed();
    }
  }

  /**
   * Close the dialog programmatically
   */
  closeDialog() {
    if (this.dialogInstance) {
      this.dialogInstance.close();
      this.dialogInstance = null;
      console.log('✅ Dialog closed');
    }
  }

  /**
   * Called when dialog is closed
   * Override in subclass for custom behavior
   */
  onDialogClosed() {
    console.log('Dialog was closed');
  }

  /**
   * Fallback: Display results inline in taskpane
   * @param {Object} results - Results to display
   */
  displayResultsInline(results) {
    console.log('📊 Displaying results inline (fallback)');
    
    // Hide input panel
    const inputPanel = document.getElementById(this.config.inputPanelId);
    if (inputPanel) {
      inputPanel.style.display = 'none';
    }

    // Show results section
    let resultsSection = document.getElementById('inlineResults');
    if (!resultsSection) {
      resultsSection = document.createElement('div');
      resultsSection.id = 'inlineResults';
      resultsSection.className = 'inline-results';
      document.querySelector('.card-body').appendChild(resultsSection);
    }

    // Build results HTML
    const html = this.buildResultsHTML(results);
    
    // Add back button
    const backButton = `
      <button class="btn btn-primary" onclick="window.analysisModule.showInputPanel()" style="margin-bottom: 16px;">
        <i class="fa fa-arrow-left"></i> Back to Input
      </button>
    `;
    
    resultsSection.innerHTML = backButton + html;
    resultsSection.style.display = 'block';
  }

  /**
   * Show input panel (hide results)
   */
  showInputPanel() {
    const inputPanel = document.getElementById(this.config.inputPanelId);
    const resultsSection = document.getElementById('inlineResults');
    
    if (inputPanel) inputPanel.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';
  }

  /**
   * Export results to Excel worksheet
   * @param {Object} data - Data to export
   */
  async exportResultsToExcel(data) {
    if (!this.isOfficeContext) {
      console.warn('⚠️ Not in Office context, cannot export to Excel');
      return;
    }

    try {
      await Excel.run(async (context) => {
        // Create new worksheet for results
        const sheets = context.workbook.worksheets;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const sheetName = `${this.moduleName} ${timestamp}`;
        
        const sheet = sheets.add(sheetName);
        sheet.activate();
        
        // Write data to worksheet
        await this.writeDataToSheet(context, sheet, data);
        
        await context.sync();
        
        console.log('✅ Results exported to Excel');
        this.showToast('Results exported to Excel successfully', 'success');
      });
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      this.showToast('Failed to export to Excel', 'error');
    }
  }

  /**
   * Write data to Excel sheet (override in subclass for custom formatting)
   * @param {Excel.RequestContext} context - Excel context
   * @param {Excel.Worksheet} sheet - Target worksheet
   * @param {Object} data - Data to write
   */
  async writeDataToSheet(context, sheet, data) {
    // Default implementation - write as JSON
    const range = sheet.getRange('A1');
    range.values = [[JSON.stringify(data, null, 2)]];
    range.format.autofitColumns();
  }

  /**
   * Load data from Excel
   * @returns {Promise<Object>} Data object
   */
  async loadDataFromExcel() {
    if (!this.isOfficeContext) {
      console.warn('⚠️ Not in Office context');
      return null;
    }

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const usedRange = sheet.getUsedRange();
        usedRange.load('values');
        
        await context.sync();
        
        const values = usedRange.values;
        
        // Parse data (assuming first row is headers)
        const headers = values[0];
        const data = [];
        
        for (let i = 1; i < values.length; i++) {
          const row = {};
          headers.forEach((header, j) => {
            row[header] = values[i][j];
          });
          data.push(row);
        }
        
        console.log('✅ Loaded data from Excel:', data.length, 'rows');
        return { headers, data };
      });
    } catch (error) {
      console.error('❌ Error loading data from Excel:', error);
      return null;
    }
  }

  /**
   * Build results HTML (to be implemented by subclasses)
   * @param {Object} results - Results object
   * @returns {string} HTML string
   */
  buildResultsHTML(results) {
    // Override in subclass
    return '<p>Results displayed here</p>';
  }

  /**
   * Show toast notification (Office.js compatible)
   * @param {string} message - Message to display
   * @param {string} type - Type (success, error, warning, info)
   */
  showToast(message, type = 'info') {
    // Use Office.js notification if available
    if (this.isOfficeContext && Office.context.ui.displayDialogAsync) {
      // Simple console log for now (Office.js doesn't have native toast)
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    // Use parent implementation
    super.showToast(message, type);
  }
}

export default BaseAnalyticsOffice;

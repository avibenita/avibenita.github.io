/**
 * Statistico Analytics - Universal Saved Analyses Manager
 * 
 * Manages saving and loading analysis configurations across all modules
 * using Office.context.document.settings (workbook-specific storage)
 */

const SavedAnalysesManager = (function() {
  'use strict';

  const PROPERTY_KEY = 'STATISTICO_ANALYSES';
  const MAX_ANALYSES = 100; // Safety limit
  
  /**
   * Check if we're running in a dialog context
   * @returns {boolean}
   */
  function isDialogContext() {
    return typeof Office !== 'undefined' && 
           Office.context && 
           Office.context.ui && 
           typeof Office.context.ui.messageParent === 'function';
  }
  
  /**
   * Check if Office.js is ready and settings API is available
   * @returns {boolean}
   */
  function isOfficeReady() {
    return typeof Office !== 'undefined' && 
           Office.context && 
           Office.context.document && 
           Office.context.document.settings;
  }
  
  /**
   * Wait for Office.js to be ready
   * @returns {Promise<void>}
   */
  function ensureOfficeReady() {
    return new Promise((resolve) => {
      if (isOfficeReady()) {
        resolve();
        return;
      }
      
      // Wait for Office.onReady
      if (typeof Office !== 'undefined' && Office.onReady) {
        Office.onReady(() => {
          // Double-check after onReady
          if (isOfficeReady()) {
            resolve();
          } else {
            // If still not ready, wait a bit and resolve anyway
            setTimeout(resolve, 500);
          }
        });
      } else {
        // Office.js not loaded yet, wait and retry
        setTimeout(() => {
          ensureOfficeReady().then(resolve);
        }, 100);
      }
    });
  }

  /**
   * Save via message to parent taskpane (for dialog contexts)
   * @param {string} action - The action to perform
   * @param {Object} data - The data to send
   * @returns {Promise<any>} Response from parent
   */
  function sendMessageToParent(action, data) {
    return new Promise((resolve, reject) => {
      try {
        const messageId = `msg_${Date.now()}_${Math.random()}`;
        const message = JSON.stringify({
          action: action,
          data: data,
          messageId: messageId
        });
        
        console.log('📤 Sending message to parent:', action);
        Office.context.ui.messageParent(message);
        
        // For now, resolve immediately as we can't get a response back easily
        // The parent will handle the save
        setTimeout(() => resolve(true), 100);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Save an analysis configuration to the workbook
   * @param {Object} analysisData - The analysis configuration
   * @returns {Promise<boolean>} Success status
   */
  async function saveAnalysis(analysisData) {
    try {
      console.log('💾 Saving analysis to workbook:', analysisData.name);
      
      // Ensure Office.js is ready
      await ensureOfficeReady();
      
      // Check if we're in a dialog context
      if (isDialogContext()) {
        console.log('📡 Dialog context detected, using message passing');
        // In dialog context, send message to parent taskpane
        return await sendMessageToParent('SAVE_ANALYSIS', analysisData);
      }
      
      // In taskpane context, use settings API directly
      if (!isOfficeReady()) {
        throw new Error('Office.js settings API is not available');
      }
      
      // Load existing analyses
      const allAnalyses = await loadAllAnalyses();
      
      // Check if updating existing or adding new
      const existingIndex = allAnalyses.findIndex(a => a.id === analysisData.id);
      if (existingIndex >= 0) {
        allAnalyses[existingIndex] = analysisData;
        console.log('📝 Updated existing analysis');
      } else {
        // Check limit
        if (allAnalyses.length >= MAX_ANALYSES) {
          throw new Error(`Maximum of ${MAX_ANALYSES} saved analyses reached`);
        }
        allAnalyses.push(analysisData);
        console.log('➕ Added new analysis');
      }
      
      // Save using Office.context.document.settings
      return new Promise((resolve, reject) => {
        try {
          const settings = Office.context.document.settings;
          settings.set(PROPERTY_KEY, JSON.stringify(allAnalyses));
          
          settings.saveAsync((asyncResult) => {
            if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
              console.log('✅ Analysis saved successfully');
              resolve(true);
            } else {
              console.error('❌ Failed to save:', asyncResult.error);
              reject(new Error(asyncResult.error.message));
            }
          });
        } catch (error) {
          reject(error);
        }
      });
      
    } catch (error) {
      console.error('❌ Error saving analysis:', error);
      throw error;
    }
  }

  /**
   * Load all saved analyses from the workbook
   * @returns {Promise<Array>} Array of saved analyses
   */
  async function loadAllAnalyses() {
    try {
      // Ensure Office.js is ready
      await ensureOfficeReady();
      
      // In dialog context, we can't load directly
      // The taskpane should handle this
      if (isDialogContext()) {
        console.log('📡 Dialog context: Cannot load analyses directly');
        return [];
      }
      
      if (!isOfficeReady()) {
        console.warn('⚠️ Office.js settings API not available');
        return [];
      }
      
      return new Promise((resolve) => {
        try {
          const settings = Office.context.document.settings;
          const data = settings.get(PROPERTY_KEY);
          
          if (data) {
            const analyses = JSON.parse(data);
            console.log(`📂 Loaded ${analyses.length} saved analyses`);
            resolve(analyses);
          } else {
            console.log('📂 No saved analyses found');
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Error loading analyses:', error);
          resolve([]);
        }
      });
    } catch (error) {
      console.error('❌ Error loading analyses:', error);
      return [];
    }
  }

  /**
   * Load a specific analysis by ID
   * @param {string} analysisId - The analysis ID
   * @returns {Promise<Object|null>} The analysis or null if not found
   */
  async function loadAnalysisById(analysisId) {
    const allAnalyses = await loadAllAnalyses();
    const analysis = allAnalyses.find(a => a.id === analysisId);
    return analysis || null;
  }

  /**
   * Delete an analysis from the workbook
   * @param {string} analysisId - The analysis ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async function deleteAnalysis(analysisId) {
    try {
      console.log('🗑️ Deleting analysis:', analysisId);
      
      // Ensure Office.js is ready
      await ensureOfficeReady();
      
      // Check if we're in a dialog context
      if (isDialogContext()) {
        console.log('📡 Dialog context detected, using message passing');
        return await sendMessageToParent('DELETE_ANALYSIS', analysisId);
      }
      
      if (!isOfficeReady()) {
        throw new Error('Office.js settings API is not available');
      }
      
      const allAnalyses = await loadAllAnalyses();
      const filtered = allAnalyses.filter(a => a.id !== analysisId);
      
      if (filtered.length === allAnalyses.length) {
        console.warn('⚠️ Analysis not found:', analysisId);
        return false;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const settings = Office.context.document.settings;
          settings.set(PROPERTY_KEY, JSON.stringify(filtered));
          
          settings.saveAsync((asyncResult) => {
            if (asyncResult.status === Office.AsyncResultStatus.Succeeded) {
              console.log('✅ Analysis deleted successfully');
              resolve(true);
            } else {
              console.error('❌ Failed to delete:', asyncResult.error);
              reject(new Error(asyncResult.error.message));
            }
          });
        } catch (error) {
          reject(error);
        }
      });
      
    } catch (error) {
      console.error('❌ Error deleting analysis:', error);
      throw error;
    }
  }

  /**
   * Toggle star status of an analysis
   * @param {string} analysisId - The analysis ID
   * @returns {Promise<boolean>} New star status
   */
  async function toggleStar(analysisId) {
    try {
      const allAnalyses = await loadAllAnalyses();
      const analysis = allAnalyses.find(a => a.id === analysisId);
      
      if (!analysis) {
        throw new Error('Analysis not found');
      }
      
      analysis.starred = !analysis.starred;
      await saveAnalysis(analysis);
      
      return analysis.starred;
    } catch (error) {
      console.error('❌ Error toggling star:', error);
      throw error;
    }
  }

  /**
   * Get analyses filtered by module
   * @param {string} moduleName - The module name (e.g., 'regression', 'hypothesis')
   * @returns {Promise<Array>} Filtered analyses
   */
  async function getAnalysesByModule(moduleName) {
    const allAnalyses = await loadAllAnalyses();
    return allAnalyses.filter(a => a.module === moduleName);
  }

  /**
   * Create a default analysis name based on module and config
   * @param {string} module - Module name
   * @param {Object} config - Module config
   * @returns {string} Default name
   */
  function generateDefaultName(module, config) {
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    switch (module) {
      case 'regression':
        return `${config.y} Model (${timestamp})`;
      case 'hypothesis':
        return `${config.parameter} Test (${timestamp})`;
      case 'correlation':
        return `Correlation (${timestamp})`;
      case 'descriptive':
        return `Descriptive Stats (${timestamp})`;
      case 'normality':
        return `Normality Test (${timestamp})`;
      default:
        return `Analysis (${timestamp})`;
    }
  }

  /**
   * Validate data range still exists in workbook
   * Note: This function uses Excel.run and should only be called from taskpanes, not dialogs
   * @param {string} dataRange - Excel range reference
   * @returns {Promise<boolean>} True if valid
   */
  async function validateDataRange(dataRange) {
    try {
      // Check if Excel API is available
      if (typeof Excel === 'undefined' || !Excel.run) {
        console.warn('⚠️ Excel API not available, skipping validation');
        return true; // Assume valid if we can't check
      }
      
      await Excel.run(async (context) => {
        // Try to get the range - will throw if invalid
        const testRange = context.workbook.worksheets.getActiveWorksheet().getRange(dataRange);
        testRange.load('address');
        await context.sync();
        return true;
      });
      return true;
    } catch (error) {
      console.warn('⚠️ Data range validation failed:', dataRange, error);
      return false;
    }
  }

  // Public API
  return {
    saveAnalysis,
    loadAllAnalyses,
    loadAnalysisById,
    deleteAnalysis,
    toggleStar,
    getAnalysesByModule,
    generateDefaultName,
    validateDataRange
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.SavedAnalysesManager = SavedAnalysesManager;
}

/**
 * Data Handler - Common data processing and management
 * @module data-handler
 */

export class DataHandler {
  constructor() {
    this.rawData = null;
    this.variableNames = [];
    this.columnMapping = {};
    this.namedRange = '';
    this.selectedVariables = [];
  }

  /**
   * Load data from sessionStorage
   * @returns {boolean} Success status
   */
  loadFromSessionStorage() {
    try {
      const storedData = sessionStorage.getItem('analysisData');
      if (!storedData) {
        console.log('ℹ️ No data in sessionStorage');
        return false;
      }

      const parsedData = JSON.parse(storedData);
      const { data, headers, columnMapping, namedRange } = parsedData;
      
      this.rawData = data;
      this.variableNames = headers;
      this.columnMapping = columnMapping || {};
      this.namedRange = namedRange || '';
      
      console.log(`✅ Loaded data: ${data.length} rows, ${headers.length} columns`);
      if (columnMapping) console.log('📍 Column mapping received:', columnMapping);
      if (namedRange) console.log('📗 Named range:', namedRange);
      
      return true;
    } catch (error) {
      console.error('❌ Error loading from sessionStorage:', error);
      return false;
    }
  }

  /**
   * Save data to sessionStorage
   */
  saveToSessionStorage() {
    try {
      const dataToStore = {
        data: this.rawData,
        headers: this.variableNames,
        columnMapping: this.columnMapping,
        namedRange: this.namedRange
      };
      sessionStorage.setItem('analysisData', JSON.stringify(dataToStore));
      console.log('✅ Data saved to sessionStorage');
    } catch (error) {
      console.error('❌ Error saving to sessionStorage:', error);
    }
  }

  /**
   * Get selected variables from InputsXL panel
   * @returns {Array|null} Array of selected variable names or null
   */
  getSelectedFromInputsXL() {
    try {
      // Try getSelectedVariables() function first (most reliable)
      if (window.parent && window.parent !== window && window.parent.getSelectedVariables) {
        const parentSelected = window.parent.getSelectedVariables();
        if (Array.isArray(parentSelected) && parentSelected.length > 0) {
          console.log('✅ Got selection from InputsXL.getSelectedVariables():', parentSelected);
          return parentSelected;
        }
      }
      
      // Try selectedVariables property
      if (window.parent && window.parent !== window && window.parent.selectedVariables) {
        const parentSelected = window.parent.selectedVariables;
        if (Array.isArray(parentSelected) && parentSelected.length > 0) {
          console.log('✅ Got selection from InputsXL.selectedVariables:', parentSelected);
          return parentSelected;
        }
      }
      
      // Try top window as fallback
      if (window.top && window.top !== window && window.top.selectedVariables) {
        const topSelected = window.top.selectedVariables;
        if (Array.isArray(topSelected) && topSelected.length > 0) {
          console.log('✅ Got selection from top.selectedVariables:', topSelected);
          return topSelected;
        }
      }
    } catch (e) {
      console.log('ℹ️ Could not access InputsXL panel:', e.message);
    }
    return null;
  }

  /**
   * Set selected variables
   * @param {Array} variables - Array of variable names
   */
  setSelectedVariables(variables) {
    if (Array.isArray(variables)) {
      this.selectedVariables = variables;
      console.log('✅ Selected variables updated:', variables);
    }
  }

  /**
   * Get data for selected variables
   * @returns {Object} Object with variable names as keys and arrays of values
   */
  getSelectedData() {
    if (!this.rawData || this.selectedVariables.length === 0) {
      return {};
    }

    const result = {};
    this.selectedVariables.forEach(varName => {
      if (this.variableNames.includes(varName)) {
        result[varName] = this.rawData.map(row => row[varName]).filter(v => v !== null && !isNaN(v));
      }
    });
    
    return result;
  }

  /**
   * Get variable by name
   * @param {string} varName - Variable name
   * @returns {Array} Array of values
   */
  getVariable(varName) {
    if (!this.rawData || !this.variableNames.includes(varName)) {
      return [];
    }
    return this.rawData.map(row => row[varName]).filter(v => v !== null && !isNaN(v));
  }

  /**
   * Get all variables data
   * @returns {Object} Object with all variable names as keys
   */
  getAllData() {
    if (!this.rawData) {
      return {};
    }

    const result = {};
    this.variableNames.forEach(varName => {
      result[varName] = this.rawData.map(row => row[varName]).filter(v => v !== null && !isNaN(v));
    });
    
    return result;
  }

  /**
   * Validate data completeness
   * @param {Array} requiredVariables - Array of required variable names
   * @returns {Object} Validation result with status and message
   */
  validate(requiredVariables = []) {
    if (!this.rawData || this.rawData.length === 0) {
      return { valid: false, message: 'No data loaded' };
    }

    if (requiredVariables.length > 0) {
      const missing = requiredVariables.filter(v => !this.variableNames.includes(v));
      if (missing.length > 0) {
        return { valid: false, message: `Missing variables: ${missing.join(', ')}` };
      }
    }

    if (this.selectedVariables.length === 0) {
      return { valid: false, message: 'No variables selected' };
    }

    return { valid: true, message: 'Data is valid' };
  }

  /**
   * Get variable info
   * @param {string} varName - Variable name
   * @returns {Object} Variable information
   */
  getVariableInfo(varName) {
    if (!this.variableNames.includes(varName)) {
      return null;
    }

    const values = this.getVariable(varName);
    const columnIndex = this.columnMapping[varName] || this.variableNames.indexOf(varName) + 1;
    
    return {
      name: varName,
      columnIndex,
      count: values.length,
      hasData: values.length > 0
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.rawData = null;
    this.variableNames = [];
    this.columnMapping = {};
    this.namedRange = '';
    this.selectedVariables = [];
    console.log('✅ Data handler cleared');
  }

  /**
   * Get data summary
   * @returns {Object} Summary information
   */
  getSummary() {
    return {
      hasData: this.rawData !== null,
      rowCount: this.rawData ? this.rawData.length : 0,
      variableCount: this.variableNames.length,
      selectedCount: this.selectedVariables.length,
      namedRange: this.namedRange
    };
  }
}

// Create singleton instance
export const dataHandler = new DataHandler();

/**
 * Validation - Input validation utilities
 * @module validation
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} message - Validation message
 * @property {Array} errors - Array of error messages
 */

/**
 * Validate that variables are selected
 * @param {Array} variables - Array of selected variables
 * @param {number} minCount - Minimum required count
 * @param {number} maxCount - Maximum allowed count
 * @returns {ValidationResult}
 */
export function validateVariableSelection(variables, minCount = 1, maxCount = Infinity) {
  const errors = [];
  
  if (!Array.isArray(variables)) {
    errors.push('Variables must be an array');
  } else if (variables.length < minCount) {
    errors.push(`At least ${minCount} variable(s) must be selected`);
  } else if (variables.length > maxCount) {
    errors.push(`Maximum ${maxCount} variable(s) allowed`);
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'Variable selection is valid',
    errors
  };
}

/**
 * Validate numeric data
 * @param {Array} data - Array of numeric values
 * @param {Object} options - Validation options
 * @returns {ValidationResult}
 */
export function validateNumericData(data, options = {}) {
  const {
    minLength = 2,
    allowNaN = false,
    allowInfinity = false,
    minValue = -Infinity,
    maxValue = Infinity
  } = options;
  
  const errors = [];
  
  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { valid: false, message: errors[0], errors };
  }
  
  if (data.length < minLength) {
    errors.push(`Data must contain at least ${minLength} values`);
  }
  
  const invalidValues = data.filter(v => {
    if (typeof v !== 'number') return true;
    if (!allowNaN && isNaN(v)) return true;
    if (!allowInfinity && !isFinite(v)) return true;
    if (v < minValue || v > maxValue) return true;
    return false;
  });
  
  if (invalidValues.length > 0) {
    errors.push(`Data contains ${invalidValues.length} invalid value(s)`);
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'Data is valid',
    errors
  };
}

/**
 * Validate correlation analysis inputs
 * @param {Object} config - Analysis configuration
 * @returns {ValidationResult}
 */
export function validateCorrelationAnalysis(config) {
  const errors = [];
  const { variables, data, method } = config;
  
  // Check variables
  const varValidation = validateVariableSelection(variables, 2);
  if (!varValidation.valid) {
    errors.push(...varValidation.errors);
  }
  
  // Check method
  const validMethods = ['pearson', 'spearman', 'kendall'];
  if (method && !validMethods.includes(method)) {
    errors.push(`Invalid correlation method: ${method}. Must be one of: ${validMethods.join(', ')}`);
  }
  
  // Check data
  if (data && variables) {
    variables.forEach(varName => {
      if (!data[varName] || !Array.isArray(data[varName])) {
        errors.push(`Missing or invalid data for variable: ${varName}`);
      } else {
        const dataValidation = validateNumericData(data[varName]);
        if (!dataValidation.valid) {
          errors.push(`Invalid data for ${varName}: ${dataValidation.message}`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'Correlation analysis configuration is valid',
    errors
  };
}

/**
 * Validate regression analysis inputs
 * @param {Object} config - Analysis configuration
 * @returns {ValidationResult}
 */
export function validateRegressionAnalysis(config) {
  const errors = [];
  const { dependentVariable, independentVariables, data } = config;
  
  // Check dependent variable
  if (!dependentVariable || typeof dependentVariable !== 'string') {
    errors.push('Dependent variable must be specified');
  }
  
  // Check independent variables
  const varValidation = validateVariableSelection(independentVariables, 1);
  if (!varValidation.valid) {
    errors.push(...varValidation.errors);
  }
  
  // Check for overlap
  if (dependentVariable && independentVariables && independentVariables.includes(dependentVariable)) {
    errors.push('Dependent variable cannot be used as independent variable');
  }
  
  // Check data
  if (data) {
    if (dependentVariable && data[dependentVariable]) {
      const dataValidation = validateNumericData(data[dependentVariable]);
      if (!dataValidation.valid) {
        errors.push(`Invalid dependent variable data: ${dataValidation.message}`);
      }
    }
    
    if (independentVariables) {
      independentVariables.forEach(varName => {
        if (!data[varName] || !Array.isArray(data[varName])) {
          errors.push(`Missing or invalid data for independent variable: ${varName}`);
        } else {
          const dataValidation = validateNumericData(data[varName]);
          if (!dataValidation.valid) {
            errors.push(`Invalid data for ${varName}: ${dataValidation.message}`);
          }
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'Regression analysis configuration is valid',
    errors
  };
}

/**
 * Validate t-test inputs
 * @param {Object} config - Test configuration
 * @returns {ValidationResult}
 */
export function validateTTest(config) {
  const errors = [];
  const { sample1, sample2, paired, alpha } = config;
  
  // Check sample1
  const sample1Validation = validateNumericData(sample1, { minLength: 2 });
  if (!sample1Validation.valid) {
    errors.push(`Invalid sample 1: ${sample1Validation.message}`);
  }
  
  // Check sample2 if provided
  if (sample2) {
    const sample2Validation = validateNumericData(sample2, { minLength: 2 });
    if (!sample2Validation.valid) {
      errors.push(`Invalid sample 2: ${sample2Validation.message}`);
    }
    
    // Check equal lengths for paired test
    if (paired && sample1 && sample2 && sample1.length !== sample2.length) {
      errors.push('Paired test requires equal sample sizes');
    }
  }
  
  // Check alpha
  if (alpha !== undefined && (alpha <= 0 || alpha >= 1)) {
    errors.push('Alpha must be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'T-test configuration is valid',
    errors
  };
}

/**
 * Validate ANOVA inputs
 * @param {Object} config - ANOVA configuration
 * @returns {ValidationResult}
 */
export function validateANOVA(config) {
  const errors = [];
  const { groups, alpha } = config;
  
  // Check groups
  if (!Array.isArray(groups) || groups.length < 2) {
    errors.push('At least 2 groups are required for ANOVA');
  } else {
    groups.forEach((group, index) => {
      const groupValidation = validateNumericData(group, { minLength: 2 });
      if (!groupValidation.valid) {
        errors.push(`Invalid group ${index + 1}: ${groupValidation.message}`);
      }
    });
  }
  
  // Check alpha
  if (alpha !== undefined && (alpha <= 0 || alpha >= 1)) {
    errors.push('Alpha must be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : 'ANOVA configuration is valid',
    errors
  };
}

/**
 * Show validation errors to user
 * @param {ValidationResult} validationResult - Validation result object
 * @param {HTMLElement} container - Container element for error messages
 */
export function displayValidationErrors(validationResult, container) {
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!validationResult.valid && validationResult.errors) {
    validationResult.errors.forEach(error => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message error';
      errorDiv.innerHTML = `<i class="fa fa-exclamation-circle"></i><span>${error}</span>`;
      container.appendChild(errorDiv);
    });
  }
}

/**
 * Clear validation errors
 * @param {HTMLElement} container - Container element for error messages
 */
export function clearValidationErrors(container) {
  if (container) {
    container.innerHTML = '';
  }
}

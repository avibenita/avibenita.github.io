/**
 * Statistico Calculator Helper
 * 
 * Utility functions to navigate to the Sample Size Calculator with pre-filled values
 * and auto-calculation.
 * 
 * Usage:
 *   import { navigateToCalculator } from './calculator-helper.js';
 *   // or
 *   <script src="calculator-helper.js"></script>
 *   navigateToCalculator('anova', { numGroups: 3, effectSizeF: 0.25, alpha: 0.05, power: 0.80 });
 */

/**
 * Navigate to the calculator with pre-filled parameters
 * @param {string} testType - Test type: 'one-sample-mean', 'two-sample-mean', 'one-sample-proportion', 
 *                            'two-sample-proportion', 'correlation', 'anova', 'regression'
 * @param {Object} params - Parameters object
 * @param {boolean} autoCalculate - Whether to auto-calculate on load (default: true)
 * @param {boolean} newWindow - Whether to open in new window/tab (default: false)
 */
function navigateToCalculator(testType, params = {}, autoCalculate = true, newWindow = false) {
    const baseURL = getCalculatorBaseURL();
    const urlParams = new URLSearchParams();
    
    urlParams.set('test', testType);
    if (autoCalculate) urlParams.set('autoCalculate', 'true');
    
    // Add common parameters
    if (params.alpha !== undefined) urlParams.set('alpha', params.alpha);
    if (params.power !== undefined) urlParams.set('power', params.power);
    if (params.alternative) urlParams.set('alternative', params.alternative);
    
    // Add test-specific parameters
    switch(testType) {
        case 'one-sample-mean':
        case 'two-sample-mean':
            if (params.effectSize !== undefined) urlParams.set('effectSize', params.effectSize);
            if (params.d !== undefined) urlParams.set('d', params.d);
            if (testType === 'two-sample-mean' && params.allocationRatio !== undefined) {
                urlParams.set('allocationRatio', params.allocationRatio);
            }
            break;
        case 'one-sample-proportion':
            if (params.p1 !== undefined) urlParams.set('p1', params.p1);
            if (params.p !== undefined) urlParams.set('p', params.p);
            break;
        case 'two-sample-proportion':
            if (params.p1 !== undefined) urlParams.set('p1', params.p1);
            if (params.p2 !== undefined) urlParams.set('p2', params.p2);
            break;
        case 'correlation':
            if (params.rho !== undefined) urlParams.set('rho', params.rho);
            if (params.r !== undefined) urlParams.set('r', params.r);
            if (params.rho0 !== undefined) urlParams.set('rho0', params.rho0);
            if (params.r0 !== undefined) urlParams.set('r0', params.r0);
            break;
        case 'anova':
            if (params.numGroups !== undefined) urlParams.set('numGroups', params.numGroups);
            if (params.k !== undefined) urlParams.set('k', params.k);
            if (params.effectSizeF !== undefined) urlParams.set('effectSizeF', params.effectSizeF);
            if (params.f !== undefined) urlParams.set('f', params.f);
            break;
        case 'regression':
            if (params.numPredictors !== undefined) urlParams.set('numPredictors', params.numPredictors);
            if (params.p !== undefined) urlParams.set('p', params.p);
            if (params.rsquared !== undefined) urlParams.set('rsquared', params.rsquared);
            if (params.r2 !== undefined) urlParams.set('r2', params.r2);
            if (params.R2 !== undefined) urlParams.set('R2', params.R2);
            break;
    }
    
    const fullURL = baseURL + '?' + urlParams.toString();
    
    if (newWindow) {
        window.open(fullURL, '_blank');
    } else {
        window.location.href = fullURL;
    }
}

/**
 * Get the base URL for the calculator
 * @returns {string} Base URL
 */
function getCalculatorBaseURL() {
    /**
     * Single source of truth: statistico-calculators/index-calculator.html
     * (SampleSizeCalculator.html redirects here for legacy URLs.)
     */
    const origin = window.location.origin;
    const path = window.location.pathname || '/';
    const sc = path.indexOf('/statistico-calculators');
    if (sc >= 0) {
        return origin + path.substring(0, sc) + '/statistico-calculators/index-calculator.html';
    }
    const sw = path.indexOf('/Statistico-Website/');
    if (sw >= 0) {
        return origin + path.substring(0, sw) + '/statistico-calculators/index-calculator.html';
    }
    return origin + '/statistico-calculators/index-calculator.html';
}

/**
 * Generate calculator URL without navigating (useful for href attributes)
 * @param {string} testType - Test type
 * @param {Object} params - Parameters object
 * @param {boolean} autoCalculate - Whether to auto-calculate on load (default: true)
 * @returns {string} Full URL
 */
function getCalculatorURL(testType, params = {}, autoCalculate = true) {
    const baseURL = getCalculatorBaseURL();
    const urlParams = new URLSearchParams();
    
    urlParams.set('test', testType);
    if (autoCalculate) urlParams.set('autoCalculate', 'true');
    
    // Add common parameters
    if (params.alpha !== undefined) urlParams.set('alpha', params.alpha);
    if (params.power !== undefined) urlParams.set('power', params.power);
    if (params.alternative) urlParams.set('alternative', params.alternative);
    
    // Add test-specific parameters
    switch(testType) {
        case 'one-sample-mean':
        case 'two-sample-mean':
            if (params.effectSize !== undefined) urlParams.set('effectSize', params.effectSize);
            if (params.d !== undefined) urlParams.set('d', params.d);
            if (testType === 'two-sample-mean' && params.allocationRatio !== undefined) {
                urlParams.set('allocationRatio', params.allocationRatio);
            }
            break;
        case 'one-sample-proportion':
            if (params.p1 !== undefined) urlParams.set('p1', params.p1);
            if (params.p !== undefined) urlParams.set('p', params.p);
            break;
        case 'two-sample-proportion':
            if (params.p1 !== undefined) urlParams.set('p1', params.p1);
            if (params.p2 !== undefined) urlParams.set('p2', params.p2);
            break;
        case 'correlation':
            if (params.rho !== undefined) urlParams.set('rho', params.rho);
            if (params.r !== undefined) urlParams.set('r', params.r);
            if (params.rho0 !== undefined) urlParams.set('rho0', params.rho0);
            if (params.r0 !== undefined) urlParams.set('r0', params.r0);
            break;
        case 'anova':
            if (params.numGroups !== undefined) urlParams.set('numGroups', params.numGroups);
            if (params.k !== undefined) urlParams.set('k', params.k);
            if (params.effectSizeF !== undefined) urlParams.set('effectSizeF', params.effectSizeF);
            if (params.f !== undefined) urlParams.set('f', params.f);
            break;
        case 'regression':
            if (params.numPredictors !== undefined) urlParams.set('numPredictors', params.numPredictors);
            if (params.p !== undefined) urlParams.set('p', params.p);
            if (params.rsquared !== undefined) urlParams.set('rsquared', params.rsquared);
            if (params.r2 !== undefined) urlParams.set('r2', params.r2);
            if (params.R2 !== undefined) urlParams.set('R2', params.R2);
            break;
    }
    
    return baseURL + '?' + urlParams.toString();
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { navigateToCalculator, getCalculatorURL, getCalculatorBaseURL };
}

// Make available globally
window.navigateToCalculator = navigateToCalculator;
window.getCalculatorURL = getCalculatorURL;
window.getCalculatorBaseURL = getCalculatorBaseURL;

/**
 * AI Interpretation Button - Shared Functionality
 * 
 * Usage:
 * 1. Include this file: <script src="./Ressources/ai-button.js"></script>
 * 2. Call: AIButton.init('buttonId', testDataGetter);
 * 
 * Example:
 *   AIButton.init('aiInterpretBtn', () => ({
 *     testName: 'One-Sample t-Test',
 *     testStatistic: -3.95,
 *     pValue: 0.0000,
 *     // ... other test data
 *   }));
 */

window.AIButton = (function() {
  'use strict';

  /**
   * Initialize the AI button with click handler
   * @param {string} buttonId - The ID of the AI button element
   * @param {Function} getTestData - Function that returns the current test data object
   * @param {Object} options - Optional configuration
   */
  function init(buttonId, getTestData, options = {}) {
    const button = document.getElementById(buttonId);
    
    if (!button) {
      console.warn(`⚠️ AI Button with ID "${buttonId}" not found`);
      return;
    }

    const config = {
      messageName: 'RequestAIInterpretation',
      requireTestResults: true,
      validationMessage: 'No test results available. Please run a test first.',
      ...options
    };

    button.addEventListener('click', function() {
      try {
        console.log('🤖 AI Interpretation requested');

        // Get test data
        const testData = getTestData();
        
        // Validate test data exists
        if (config.requireTestResults && (!testData || Object.keys(testData).length === 0)) {
          alert(config.validationMessage);
          return;
        }

        // Log data for debugging
        console.log('📊 Test data for AI:', testData);
        console.log('📋 JSON:', JSON.stringify(testData, null, 2));

        // Send to VB6
        const payload = JSON.stringify(testData);
        if (typeof window.sendToVB6 === 'function') {
          sendToVB6(config.messageName, payload);
          console.log('📤 AI interpretation request sent to VB6');
        } else {
          console.error('❌ sendToVB6 function not found');
          alert('Error: Communication with backend not available');
        }

      } catch (error) {
        console.error('❌ Error sending AI request:', error);
        alert('Error sending AI request: ' + error.message);
      }
    });

    console.log(`✅ AI Button "${buttonId}" initialized`);
  }

  /**
   * Disable the AI button
   * @param {string} buttonId - The ID of the AI button element
   */
  function disable(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
      button.title = 'AI Interpretation not available';
    }
  }

  /**
   * Enable the AI button
   * @param {string} buttonId - The ID of the AI button element
   * @param {string} title - Optional tooltip text
   */
  function enable(buttonId, title = 'AI Interpretation (Beta)') {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = false;
      button.title = title;
    }
  }

  /**
   * Common test data builder for hypothesis tests
   * Extracts data from window.testResultsData and DOM elements
   */
  function buildHypothesisTestData() {
    if (!window.testResultsData) {
      return null;
    }

    const effectSizeLabel = document.getElementById('effectSizeLabel')?.textContent || 'Effect Size';
    const effectSizeValue = document.getElementById('effectSizeValue')?.textContent || '--';

    return {
      testParameter: window.testResultsData.testParameter,
      testName: window.testResultsData.testName,
      testOrientation: window.testResultsData.testOrientation,
      method: window.testConfig?.method || 'unknown',
      testStatistic: window.testResultsData.testStatisticH0,
      pValue: window.testResultsData.pValueH0,
      alpha: window.testResultsData.alphaH0 || 0.05,
      effectSizeLabel: effectSizeLabel,
      effectSizeValue: effectSizeValue,
      variableName: window.currentVariableName || window.testResultsData.variableName || 'Variable',
      sampleSize: window.testResultsData.sampleSize || window.currentDataArray?.length || 0,
      h0Value: window.testConfig?.h0Value || window.testResultsData.h0Value,
      decision: window.testResultsData.pValueH0 < (window.testResultsData.alphaH0 || 0.05) ? 'Reject H0' : 'Fail to Reject H0'
    };
  }

  // Public API
  return {
    init: init,
    disable: disable,
    enable: enable,
    buildHypothesisTestData: buildHypothesisTestData
  };
})();


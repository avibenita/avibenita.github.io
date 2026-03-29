/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POWER ANALYSIS MANAGER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles all power analysis functionality:
 * - Toast notifications for errors and warnings
 * - Sample size validation and formatting
 * - Power overlay management
 * - VB6 integration for power data updates
 * 
 * Usage:
 *   <script src="./Ressources/power-analysis-manager.js"></script>
 * 
 * Dependencies: None (standalone module)
 * 
 * Public API:
 *   window.showPowerToast(message, duration)
 *   window.hidePowerToast()
 *   window.validateRequiredSampleSize(value)
 *   window.showPowerOverlay(initialTarget)
 *   window.hidePowerOverlay()
 *   window.updatePowerOverlayFromVB6(payload)
 *   window.handlePowerAnalysisError(message)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════
  
  const CONFIG = {
    PRACTICAL_LIMIT: 100000,      // Sample sizes above this are impractical
    REASONABLE_LIMIT: 50000,      // Show warning above this
    DEFAULT_TOAST_DURATION: 7000, // 7 seconds
    ERROR_TOAST_DURATION: 10000,  // 10 seconds for errors
    MIN_TARGET_POWER: 0.01,
    MAX_TARGET_POWER: 0.99
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TOAST NOTIFICATION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  
  let toastTimeout = null;

  /**
   * Show an animated toast notification
   * @param {string} message - The message to display
   * @param {number} duration - How long to show (milliseconds)
   */
  function showPowerToast(message, duration = CONFIG.DEFAULT_TOAST_DURATION) {
    const toast = document.getElementById('powerToast');
    const messageEl = document.getElementById('powerToastMessage');
    
    if (!toast || !messageEl) {
      console.warn('Toast elements not found in DOM');
      return;
    }
    
    messageEl.textContent = message;
    toast.classList.add('show');
    
    // Clear existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    
    // Auto-hide after duration
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
    
    console.log('🍞 Toast shown:', message);
  }

  /**
   * Hide the toast notification immediately
   */
  function hidePowerToast() {
    const toast = document.getElementById('powerToast');
    if (toast) {
      toast.classList.remove('show');
    }
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
  }

  /**
   * Initialize toast click-to-dismiss functionality
   */
  function initToastEvents() {
    const toast = document.getElementById('powerToast');
    if (toast) {
      toast.addEventListener('click', hidePowerToast);
      console.log('✅ Toast click-to-dismiss initialized');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAMPLE SIZE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Validate and format required sample size values
   * @param {*} value - Raw sample size value from cloud function
   * @returns {Object} { valid, displayValue, warning }
   */
  function validateRequiredSampleSize(value) {
    // Check if value is missing, null, undefined, or "N/A"
    if (value === null || value === undefined || value === 'N/A' || value === 'null') {
      return {
        valid: false,
        displayValue: 'Not Feasible',
        warning: 'The required sample size exceeds computational limits. The effect size is too small or the target power is too high to achieve with a practical sample size.'
      };
    }
    
    // Check if value is a string that needs parsing
    let numValue = value;
    if (typeof value === 'string') {
      numValue = parseFloat(value);
    }
    
    // Check for non-numeric or invalid values
    if (isNaN(numValue)) {
      return {
        valid: false,
        displayValue: 'Not Feasible',
        warning: 'The required sample size could not be calculated. The effect size may be too small or the parameters may be invalid.'
      };
    }
    
    // Check for infinity
    if (!isFinite(numValue)) {
      return {
        valid: false,
        displayValue: '∞ (Infinite)',
        warning: 'The required sample size is infinite. This typically means the effect size is zero or too small to detect at the specified power level.'
      };
    }
    
    // Check for impractical sizes
    if (numValue > CONFIG.PRACTICAL_LIMIT) {
      return {
        valid: false,
        displayValue: `> ${CONFIG.PRACTICAL_LIMIT.toLocaleString()}`,
        warning: `The required sample size (${Math.round(numValue).toLocaleString()}) exceeds practical limits. Consider: reducing target power, accepting a larger alpha, or acknowledging that the effect size may be too small to detect reliably.`
      };
    }
    
    // Check for large but possibly achievable sizes
    if (numValue > CONFIG.REASONABLE_LIMIT) {
      return {
        valid: true,
        displayValue: Math.round(numValue).toLocaleString(),
        warning: `⚠️ Very Large Sample Required: ${Math.round(numValue).toLocaleString()} observations needed. This is a substantial sample size that may be challenging to collect.`
      };
    }
    
    // Normal case - valid and reasonable
    return {
      valid: true,
      displayValue: Math.round(numValue).toLocaleString(),
      warning: null
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // POWER OVERLAY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  
  let lastRequestedTarget = '0.80';
  let overlayElements = {};

  /**
   * Initialize overlay element references
   */
  function initOverlayElements() {
    overlayElements = {
      overlay: document.getElementById('powerOverlay'),
      loader: document.getElementById('powerOverlayLoader'),
      content: document.getElementById('powerOverlayContent'),
      targetInput: document.getElementById('overlayTargetPower'),
      refreshBtn: document.getElementById('overlayRefreshBtn'),
      closeBtn: document.getElementById('powerCloseBtn'),
      loaderCancelBtn: document.getElementById('powerLoaderCancelBtn'),
      alphaValueEl: document.getElementById('overlayAlphaValue'),
      cohenDEl: document.getElementById('overlayCohenD'),
      footerNote: document.getElementById('overlayFooterNote')
    };
    
    console.log('✅ Power overlay elements initialized');
  }

  /**
   * Set loading state for power overlay
   * @param {boolean} isLoading - Whether to show loading spinner
   */
  function setLoading(isLoading) {
    if (!overlayElements.loader || !overlayElements.content) return;
    
    if (isLoading) {
      overlayElements.loader.classList.remove('hidden');
      overlayElements.content.classList.add('hidden');
    } else {
      overlayElements.loader.classList.add('hidden');
      overlayElements.content.classList.remove('hidden');
    }
  }

  /**
   * Clamp target power to valid range
   * @param {number} value - Target power value
   * @returns {number} Clamped value
   */
  function clampTarget(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 0.80;
    return Math.max(CONFIG.MIN_TARGET_POWER, Math.min(CONFIG.MAX_TARGET_POWER, num));
  }

  /**
   * Show the power overlay
   * @param {string} initialTarget - Initial target power value (e.g., "0.80")
   */
  function showOverlay(initialTarget) {
    if (!overlayElements.overlay) {
      console.error('Power overlay element not found');
      return;
    }
    
    overlayElements.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    if (overlayElements.targetInput) {
      const target = clampTarget(initialTarget || '0.80');
      overlayElements.targetInput.value = target.toFixed(2);
      lastRequestedTarget = overlayElements.targetInput.value;
    }
    
    setLoading(true);
    console.log('⚡ Power overlay opened');
  }

  /**
   * Hide the power overlay
   */
  function hideOverlay() {
    if (!overlayElements.overlay) return;
    
    overlayElements.overlay.classList.remove('open');
    document.body.style.overflow = '';
    
    // Hide toast when overlay closes
    hidePowerToast();
    
    console.log('⚡ Power overlay closed');
  }

  /**
   * Notify VB6 that overlay is closing
   */
  function notifyClose() {
    if (typeof window.sendMessageToVB6 === 'function') {
      window.sendMessageToVB6('ClosePowerOverlay', '');
    }
  }

  /**
   * Send target power to VB6 for recalculation
   * @param {string} target - Target power value
   */
  function sendTargetToVB6(target) {
    console.log('⚡ sendTargetToVB6 called with:', target);
    if (typeof window.sendMessageToVB6 === 'function') {
      console.log('⚡ Calling window.sendMessageToVB6("Case310", "' + target + '")');
      window.sendMessageToVB6('Case310', target);
      console.log('⚡ sendMessageToVB6 returned');
    } else {
      console.warn('sendMessageToVB6 not available when requesting power refresh.');
      setLoading(false);
    }
  }

  /**
   * Initialize overlay event listeners
   */
  function initOverlayEvents() {
    if (!overlayElements.overlay) return;
    
    // Close button
    if (overlayElements.closeBtn) {
      overlayElements.closeBtn.addEventListener('click', () => {
        hideOverlay();
        notifyClose();
      });
    }
    
    // Cancel button
    if (overlayElements.loaderCancelBtn) {
      overlayElements.loaderCancelBtn.addEventListener('click', () => {
        setLoading(false);
        hideOverlay();
        notifyClose();
      });
    }
    
    // Refresh button
    if (overlayElements.refreshBtn) {
      overlayElements.refreshBtn.addEventListener('click', () => {
        if (!overlayElements.targetInput) return;
        
        const rawValue = overlayElements.targetInput.value;
        const target = clampTarget(rawValue);
        
        if (target.toFixed(2) !== lastRequestedTarget) {
          overlayElements.targetInput.value = target.toFixed(2);
          lastRequestedTarget = overlayElements.targetInput.value;
        }
        
        setLoading(true);
        sendTargetToVB6(target.toFixed(2));
      });
    }
    
    // Target power input validation
    if (overlayElements.targetInput) {
      overlayElements.targetInput.addEventListener('input', function() {
        const value = parseFloat(this.value);
        if (!isNaN(value)) {
          const clamped = clampTarget(value);
          if (value !== clamped) {
            this.value = clamped.toFixed(2);
          }
        }
      });
    }
    
    // Click outside to close
    overlayElements.overlay.addEventListener('click', (e) => {
      if (e.target === overlayElements.overlay) {
        hideOverlay();
        notifyClose();
      }
    });
    
    console.log('✅ Power overlay events initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VB6 INTEGRATION - UPDATE OVERLAY
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Update a power metric display element
   * @param {string} id - Element ID
   * @param {*} value - Value to display
   * @param {string} fallback - Fallback text if value invalid
   * @param {number} decimals - Number of decimal places
   */
  function updatePowerMetric(id, value, fallback = '--', decimals = 2) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let display = fallback;
    
    if (value != null && value !== '' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
      const num = parseFloat(value);
      display = decimals === 0 
        ? Math.round(num).toLocaleString()
        : num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
    }
    
    // Add "n=" prefix for Required Sample Size
    if (id === 'overlayRequiredSample' && display !== fallback) {
      display = 'n=' + display;
    }
    
    element.textContent = display;
  }

  /**
   * Format a number for display
   * @param {*} value - Value to format
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted number
   */
  function formatNumber(value, decimals = 2) {
    if (value == null || value === '' || isNaN(parseFloat(value)) || !isFinite(parseFloat(value))) {
      return '--';
    }
    const num = parseFloat(value);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Update power overlay with data from VB6
   * @param {Object|string} payload - JSON data or stringified JSON
   */
  function updatePowerOverlayFromVB6(payload) {
    console.log('⚡ updatePowerOverlayFromVB6 CALLED', typeof payload, payload);
    let data = payload;
    
    // ✅ Handle cloud function errors gracefully
    if (typeof payload === 'string') {
      // Check if it's an error message from VB6
      if (payload.includes('Connection failed') || 
          payload.includes('Status code: 500') || 
          payload.includes('error') && !payload.startsWith('{')) {
        console.error('⚠️ Cloud function error:', payload);
        showPowerToast(
          '⚠️ Power calculation service is temporarily unavailable. The cloud function may be overloaded or the sample size calculation exceeded server limits. Please try again with a lower target power or larger effect size.',
          CONFIG.ERROR_TOAST_DURATION
        );
        setLoading(false);
        return;
      }
      
      try {
        data = JSON.parse(payload);
      } catch (error) {
        console.error('updatePowerOverlayFromVB6: failed to parse payload', error, payload);
        showPowerToast(
          '⚠️ Unable to process power analysis results. The response format was invalid.',
          CONFIG.DEFAULT_TOAST_DURATION
        );
        setLoading(false);
        return;
      }
    }

    if (!data || typeof data !== 'object') {
      console.error('updatePowerOverlayFromVB6: invalid data object', data);
      showPowerToast(
        '⚠️ Power analysis data is invalid or missing. Please try running the test again.',
        CONFIG.DEFAULT_TOAST_DURATION
      );
      setLoading(false);
      return;
    }

    console.log('⚡ Power overlay update - parsing successful', data);

    // Update basic metrics
    updatePowerMetric('overlayPowerValue', data.power ?? data.Power, '--', 2);
    updatePowerMetric('overlayEffectSize', data.effectSize ?? data.EffectSize, '--', 2);
    updatePowerMetric('overlaySampleSize', data.sampleSize ?? data.SampleSize, '--', 0);
    
    // ✅ Validate and handle required sample size with elegant warning
    const requiredSampleRaw = data.requiredSampleSize ?? data.RequiredSampleSize;
    console.log('📊 Required Sample Raw:', requiredSampleRaw, 'Type:', typeof requiredSampleRaw);
    const validation = validateRequiredSampleSize(requiredSampleRaw);
    console.log('📊 Validation Result:', validation);
    
    // Update the display with validated value
    const requiredSampleEl = document.getElementById('overlayRequiredSample');
    if (requiredSampleEl) {
      requiredSampleEl.textContent = validation.displayValue;
      
      // Add visual indicator for warnings/errors
      if (!validation.valid) {
        requiredSampleEl.classList.add('sample-size-warning');
      } else {
        requiredSampleEl.classList.remove('sample-size-warning');
      }
    }
    
    // Show toast notification if there's a warning
    if (validation.warning) {
      console.warn('⚠️ Sample size warning:', validation.warning);
      showPowerToast(validation.warning, CONFIG.DEFAULT_TOAST_DURATION);
    }

    // Stop spinner immediately after Required Sample Size is updated
    console.log('⚡ Required Sample Size updated - stopping spinner');
    setLoading(false);

    // Update alpha and Cohen's d
    if (overlayElements.alphaValueEl) {
      overlayElements.alphaValueEl.textContent = formatNumber(data.alpha ?? data.Alpha ?? 0.05, 2);
    }

    if (overlayElements.cohenDEl) {
      const cohenValue = data.cohenD ?? data.CohenD ?? data.effectSize ?? data.EffectSize;
      overlayElements.cohenDEl.textContent = formatNumber(cohenValue, 2);
    }

    // Update target power input
    if (overlayElements.targetInput && data.targetPower !== undefined) {
      const target = clampTarget(data.targetPower ?? data.TargetPower);
      overlayElements.targetInput.value = target.toFixed(2);
      lastRequestedTarget = overlayElements.targetInput.value;
    }

    // Update footer note
    if (overlayElements.footerNote && data.tailType) {
      overlayElements.footerNote.textContent = `Tail: ${data.tailType || data.orientation || ''} • Observed Power: ${formatNumber(data.power ?? data.Power, 2)}`;
    }

    // Sync with results panel if available
    if (typeof window.injectPowerResultsFromVB6 === 'function') {
      try {
        window.injectPowerResultsFromVB6(data);
      } catch (err) {
        console.error('Power overlay sync failed:', err);
      }
    }

    console.log('⚡ Power overlay update COMPLETE');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Handle power analysis errors from VB6
   * @param {string} message - Error message
   */
  function handlePowerAnalysisError(message) {
    console.error('⚠️ Power analysis error:', message);
    
    // Customize message based on error type
    let userMessage = message || 'Power analysis could not be retrieved.';
    
    if (message && message.includes('500')) {
      userMessage = '⚠️ Cloud function error: The power calculation service encountered an internal error. This typically happens when sample size calculations exceed server limits. Try reducing target power or using a larger effect size.';
    } else if (message && (message.includes('Connection failed') || message.includes('timeout'))) {
      userMessage = '⚠️ Connection error: Unable to reach the power calculation service. Please check your internet connection and try again.';
    } else if (message && (message.includes('limit') || message.includes('exceeds'))) {
      userMessage = '⚠️ Calculation limit exceeded: The required sample size is too large to compute. Consider adjusting your power analysis parameters.';
    }
    
    // Show toast notification
    showPowerToast(userMessage, CONFIG.ERROR_TOAST_DURATION);
    
    // Hide overlay if it's open
    hideOverlay();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // POWER BUTTON HANDLER (Results Panel)
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Initialize power button in results panel
   */
  function initPowerButton() {
    const powerBtn = document.getElementById('togglePowerBtn');
    if (!powerBtn) {
      console.warn('Power button (togglePowerBtn) not found');
      return;
    }
    
    powerBtn.addEventListener('click', function() {
      console.log('🧠 Power Analysis requested');
      
      // Get test configuration
      const testConfig = window.testConfig;
      const testParameter = testConfig?.parameter || window.testResultsData?.testParameter || 'Mean';
      const testMethod = testConfig?.method || 'classical';
      
      console.log('  → Test Parameter:', testParameter);
      console.log('  → Test Method:', testMethod);
      
      // Check if bootstrap method is used
      if (testMethod === 'bootstrap') {
        // Show informative message for bootstrap tests
        const parameterName = testParameter.toLowerCase();
        let message = `⚠️ Power Analysis Not Available for Bootstrap Tests\n\n`;
        message += `Bootstrap ${parameterName} tests don't have analytical power formulas. `;
        message += `Power analysis requires nested resampling which is computationally prohibitive.\n\n`;
        message += `📊 Sample Size Guidelines for Bootstrap Tests:\n\n`;
        message += `• Small effects: 150-200 observations\n`;
        message += `• Medium effects: 50-80 observations\n`;
        message += `• Large effects: 25-40 observations\n\n`;
        message += `💡 Tip: Bootstrap tests typically require 10-25% more observations than classical tests for equivalent power.\n\n`;
        message += `For precise power analysis, use Classical methods (available for Mean and Variance tests).`;
        
        alert(message);
        return;
      }
      
      // Check if power analysis is available for this parameter
      if (testParameter !== 'Variance' && testParameter !== 'Mean') {
        let message = `⚠️ Power Analysis Not Yet Implemented\n\n`;
        message += `Power analysis is currently available only for:\n`;
        message += `• Classical Variance Tests (Chi-square)\n`;
        message += `• Classical Mean Tests (t-test) - Coming soon\n\n`;
        message += `For ${testParameter} tests, please use bootstrap method with the sample size guidelines:\n`;
        message += `• Small effects: 150-200 observations\n`;
        message += `• Medium effects: 50-80 observations\n`;
        message += `• Large effects: 25-40 observations`;
        
        alert(message);
        return;
      }
      
      // Proceed with power analysis for supported tests
      // Show loading state
      showPowerAnalysisLoading();
      
      // Send message to VB6 to calculate power analysis
      sendToVB6('ShowPowerAnalysis', testParameter);
    });
    
    console.log('✅ Power button initialized');
  }
  
  /**
   * Show loading state in power results panel
   */
  function showPowerAnalysisLoading() {
    const panel = document.getElementById('powerResultsPanel');
    if (panel) {
      panel.style.display = 'flex';
      panel.classList.add('loading');
    }

    const status = document.getElementById('powerStatus');
    if (status) {
      status.textContent = 'Fetching power analysis…';
    }

    updatePowerMetricInPanel('powerObserved', '--', '--');
    updatePowerMetricInPanel('powerEffectSize', '--', '--');
    updatePowerMetricInPanel('powerSampleSize', '--', '--', 0);
    updatePowerMetricInPanel('powerRequired', '--', '--', 0);

    const note = document.getElementById('powerNote');
    if (note) {
      note.textContent = 'Contacting the power analysis service…';
    }

    const effectLabel = document.getElementById('powerEffectLabel');
    if (effectLabel) {
      effectLabel.textContent = 'Effect Size';
    }
  }
  
  /**
   * Update power metric in results panel
   */
  function updatePowerMetricInPanel(id, value, fallback = '--', decimals = 2) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let display = fallback;
    
    if (value != null && value !== '' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
      const num = parseFloat(value);
      display = decimals === 0 
        ? Math.round(num).toLocaleString()
        : num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
          });
    }
    
    element.textContent = display;
  }
  
  /**
   * Send message to VB6
   */
  function sendToVB6(caseCode, data) {
    try {
      console.log('📤 Sending to VB6 - Case:', caseCode);
      console.log('   Data:', data);
      
      if (typeof window.sendMessageToVB6 === 'function') {
        console.log('✅ Found VB6 injected sendMessageToVB6 function');
        window.sendMessageToVB6(caseCode, data);
      } else {
        console.warn('⚠️ window.sendMessageToVB6 not found');
        showPowerToast('⚠️ Cannot communicate with VB6. Power analysis unavailable.', CONFIG.ERROR_TOAST_DURATION);
      }
    } catch(e) {
      console.error('❌ Error sending to VB6:', e);
      showPowerToast('⚠️ Error communicating with VB6: ' + e.message, CONFIG.ERROR_TOAST_DURATION);
    }
  }
  
  /**
   * Inject power results into results panel (called by VB6)
   */
  function injectPowerResultsFromVB6(payload) {
    try {
      console.log('⚡ injectPowerResultsFromVB6 called', payload);
      
      let data = payload;
      if (typeof payload === 'string') {
        data = JSON.parse(payload);
      }
      
      if (!data || typeof data !== 'object') {
        console.error('Invalid power results data');
        handlePowerAnalysisError('Invalid power analysis data received');
        return;
      }
      
      // Hide loading state
      const panel = document.getElementById('powerResultsPanel');
      if (panel) {
        panel.classList.remove('loading');
      }
      
      const status = document.getElementById('powerStatus');
      if (status) {
        status.textContent = 'Power Analysis';
      }
      
      // Update metrics
      updatePowerMetricInPanel('powerObserved', data.power, '--', 2);
      
      const effectValue = data.effectSize != null ? data.effectSize : data.varianceRatio;
      const effectDecimals = (data.powerCase || '').toLowerCase() === 'variance' ? 3 : 2;
      updatePowerMetricInPanel('powerEffectSize', effectValue, '--', effectDecimals);
      updatePowerMetricInPanel('powerSampleSize', data.sampleSize, '--', 0);
      
      // Validate required sample size (consistent with overlay)
      const validation = validateRequiredSampleSize(data.requiredSampleSize);
      updatePowerMetricInPanel('powerRequired', validation.displayValue, '--', 0);
      
      // Update note
      const note = document.getElementById('powerNote');
      if (note) {
        const parts = [];
        if (typeof data.sampleMean === 'number') {
          parts.push(`Mean ${formatNumber(data.sampleMean, 3)}`);
        }
        if (typeof data.sampleStdev === 'number') {
          parts.push(`Std ${formatNumber(data.sampleStdev, 3)}`);
        }

        const orientation = data.orientation || 'two-sided';
        const tailInfo = data.tailType ? ` (${data.tailType})` : '';
        const caseLabel = data.powerCase || data.parameter || 'Mean';
        const extras = parts.length ? ` · ${parts.join(' · ')}` : '';
        note.innerHTML = `<strong>${caseLabel}</strong> · Orientation: ${orientation}${tailInfo}${extras}`;
      }
      
      console.log('✅ Power results injected successfully');
      
    } catch (error) {
      console.error('injectPowerResultsFromVB6 failed', error);
      handlePowerAnalysisError('Unable to display power analysis results.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * Initialize the power analysis manager
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    console.log('🔋 Initializing Power Analysis Manager...');
    
    initToastEvents();
    initOverlayElements();
    initOverlayEvents();
    initPowerButton();
    
    console.log('✅ Power Analysis Manager initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════
  
  // Expose functions to window for VB6 integration
  window.showPowerToast = showPowerToast;
  window.hidePowerToast = hidePowerToast;
  window.validateRequiredSampleSize = validateRequiredSampleSize;
  window.showPowerOverlay = showOverlay;
  window.hidePowerOverlay = hideOverlay;
  window.updatePowerOverlayFromVB6 = updatePowerOverlayFromVB6;
  window.injectPowerResultsFromVB6 = injectPowerResultsFromVB6;
  window.handlePowerAnalysisError = handlePowerAnalysisError;
  
  // Auto-initialize
  init();
  
  console.log('✅ Power Analysis Manager module loaded');
  
})();

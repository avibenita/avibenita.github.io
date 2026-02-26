/**
 * Confidence Interval View - Matches 0confidence-interval.html
 * 
 * Shared Analysis Component - Uses EXACT same calculations as 0confidence-interval.html
 * 
 * Can be used by: Univariate, Regression, any module needing confidence intervals
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n }
 * - NO external libraries needed (jStat not required)
 * 
 * Exports:
 * - displayConfidenceIntervalView() - Main display function
 * - Bootstrap and Classical CI calculations
 * 
 * Implementation Notes:
 * - Classical Mean: T-distribution with optional FPC correction
 * - Classical Stdev: Chi-square distribution (asymmetric intervals)
 * - Bootstrap: Percentile method for all statistics
 * - All helper functions match HTML version exactly
 */

let currentMethod = 'classical';
let currentParameter = 'mean';
let currentConfidence = 95;

/**
 * Display confidence interval view - Matches 0confidence-interval.html UI exactly
 */
function displayConfidenceIntervalView() {
  const { column, n } = resultsData;
  
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  // Match HTML version UI exactly (dark theme with 4-frame configuration)
  document.getElementById('resultsContent').innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <style>
      /* Dark theme matching 0confidence-interval.html */
      .ci-section {
        background: #242938;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 0;
        border: 1px solid #2d3748;
        flex: 1;
      }
      
      .ci-section-title {
        color: rgba(255,255,255,0.6);
        font-size: 0.85em;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        font-weight: bold;
      }
      
      .ci-inline-radio {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
        align-items: center;
      }
      
      .ci-radio-option {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        color: rgba(255,255,255,0.8);
        font-size: 14px;
      }
      
      .ci-radio-option.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .ci-radio-option input[type="radio"] {
        cursor: pointer;
        width: 18px;
        height: 18px;
        accent-color: rgb(255,165,120);
      }
      
      .ci-radio-option.disabled input {
        cursor: not-allowed;
      }
      
      .ci-panel-row {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
      }
      
      .ci-alpha-control {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .ci-alpha-control select {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        color: white;
        padding: 6px 10px;
      }
      
      .ci-alpha-control select option {
        background: #1a1f2e;
        color: white;
        padding: 8px;
      }
      
      .ci-alpha-control select option:hover {
        background: #242938;
      }
      
      /* Style all dropdown options */
      select option {
        background: #1a1f2e;
        color: white;
        padding: 8px;
      }
      
      select option:checked {
        background: #242938;
      }
      
      .ci-alpha-control input[type="range"] {
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.2);
        outline: none;
        -webkit-appearance: none;
      }
      
      .ci-alpha-control input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgb(255,165,120);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(255,165,120,0.5);
      }
      
      .ci-alpha-display {
        font-size: 15px;
        font-weight: 600;
        color: rgb(255,165,120);
        min-width: 60px;
        text-align: center;
      }
      
      .ci-inline-control {
        display: none;
        margin-left: 20px;
        align-items: center;
        gap: 8px;
      }
      
      .ci-inline-control.active {
        display: flex;
      }
      
      .ci-inline-control input[type="number"] {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        color: white;
        padding: 4px 8px;
        width: 80px;
        font-size: 13px;
      }
      
      .ci-refresh-btn {
        background: linear-gradient(135deg, rgb(255,165,120), rgb(255,140,90));
        border: none;
        color: white;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      
      .ci-refresh-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(255,165,120,0.5);
      }
      
      .ci-results-panel {
        background: #1a1f2e;
        border-radius: 10px;
        padding: 20px;
        border: 2px solid rgba(255,255,255,0.25);
        margin-top: 15px;
      }
      
      .ci-result-large {
        text-align: center;
        font-size: 28px;
        font-weight: 600;
        color: rgb(255,165,120);
        margin: 15px 0;
        letter-spacing: 0.5px;
      }
      
      .ci-plus-minus {
        font-size: 24px;
        color: rgba(255,255,255,0.8);
        margin: 0 8px;
      }
      
      .ci-confidence-bar-container {
        position: relative;
        height: 60px;
        margin: 20px 0;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .ci-confidence-bar {
        position: absolute;
        height: 100%;
        background: linear-gradient(90deg, rgba(120,200,255,0.2), rgba(120,200,255,0.4), rgba(120,200,255,0.2));
        border: 2px solid rgb(120,200,255);
        border-radius: 4px;
        transition: all 0.3s ease;
      }
      
      .ci-confidence-bar.bootstrap {
        background: linear-gradient(90deg, rgba(255,165,120,0.2), rgba(255,165,120,0.4), rgba(255,165,120,0.2));
        border: 2px solid rgb(255,165,120);
      }
      
      .ci-confidence-marker {
        position: absolute;
        width: 3px;
        height: 100%;
        background: rgb(255,165,120);
        box-shadow: 0 0 10px rgb(255,165,120);
        left: 50%;
        transform: translateX(-50%);
      }
      
      .ci-delta-label {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-size: 13px;
        font-weight: 700;
        color: white;
        background: rgba(0,0,0,0.8);
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.3);
      }
      
      .ci-delta-label.left { left: 8px; }
      .ci-delta-label.right { right: 8px; }
      
      .ci-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 20px 0;
      }
      
      .ci-stat-box {
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px;
        padding: 12px;
        text-align: center;
      }
      
      .ci-stat-label {
        font-size: 10px;
        color: rgba(255,255,255,0.6);
        text-transform: uppercase;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
      }
      
      .ci-stat-value {
        font-size: 17px;
        font-weight: 600;
        color: white;
      }
      
      .ci-interpretation {
        margin-top: 15px;
        padding: 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.8);
        font-size: 12px;
        line-height: 1.6;
      }
      
      /* Animations for Bootstrap notice */
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
      
      /* Results panel transition */
      .ci-results-panel {
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }
    </style>
    
    <div class="ci-container">
      <!-- Configuration Panel with 4 Frames -->
      <div style="background: #1a1f2e; border-radius: 10px; padding: 20px; margin-bottom: 15px; border: 1px solid #2d3748;">
        <!-- ROW 1: METHOD and PARAMETER -->
        <div class="ci-panel-row">
          <!-- METHOD Frame -->
          <div class="ci-section">
            <div class="ci-section-title">METHOD:</div>
            <div class="ci-inline-radio">
              <label class="ci-radio-option">
                <input type="radio" name="ci-method" value="classical" checked onchange="selectMethod('classical')">
                <span>Classical</span>
              </label>
              <label class="ci-radio-option">
                <input type="radio" name="ci-method" value="bootstrap" onchange="selectMethod('bootstrap')">
                <span>Bootstrap</span>
              </label>
              
              <!-- Bootstrap Iterations (inline) -->
              <div class="ci-inline-control" id="ci-bootstrap-iterations">
                <label style="color: rgba(255,255,255,0.8); font-size: 13px;">Iterations:</label>
                <input type="number" id="ci-iterations-input" value="500" min="100" max="10000" step="100">
                <button onclick="refreshIterations()" class="ci-refresh-btn">
                  <i class="fa-solid fa-sync-alt"></i> Refresh
                </button>
              </div>
            </div>
          </div>
          
          <!-- PARAMETER Frame -->
          <div class="ci-section">
            <div class="ci-section-title">PARAMETER:</div>
            <div class="ci-inline-radio">
              <label class="ci-radio-option">
                <input type="radio" name="ci-parameter" value="mean" checked onchange="selectParameter('mean')">
                <span>Mean</span>
              </label>
              <label class="ci-radio-option">
                <input type="radio" name="ci-parameter" value="stdev" onchange="selectParameter('stdev')">
                <span>Stdev</span>
              </label>
              <label class="ci-radio-option disabled" id="ci-median-option">
                <input type="radio" name="ci-parameter" value="median" disabled onchange="selectParameter('median')">
                <span>Median</span>
              </label>
              <label class="ci-radio-option disabled" id="ci-percentile-option">
                <input type="radio" name="ci-parameter" value="percentile" disabled onchange="selectParameter('percentile')">
                <span>Percentile</span>
              </label>
              
              <!-- Percentile Value (inline) -->
              <div class="ci-inline-control" id="ci-percentile-value">
                <label style="color: rgba(255,255,255,0.8); font-size: 13px;">Value:</label>
                <input type="number" id="ci-percentile-input" value="50" min="1" max="99" step="1">
                <span style="color: rgba(255,255,255,0.8); font-size: 13px;">%</span>
                <button onclick="refreshPercentile()" class="ci-refresh-btn">
                  <i class="fa-solid fa-sync-alt"></i> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- ROW 2: ALPHA and POP SIZE -->
        <div class="ci-panel-row">
          <!-- ALPHA Frame -->
          <div class="ci-section">
            <div class="ci-alpha-control">
              <label style="color: rgba(255,255,255,0.6); font-size: 0.95em; font-weight: bold; margin-right: 10px;">α =</label>
              <select id="ci-alpha-preset" onchange="setAlphaPreset()">
                <option value="0.01">0.01 (99%)</option>
                <option value="0.02">0.02 (98%)</option>
                <option value="0.05" selected>0.05 (95%)</option>
                <option value="0.10">0.10 (90%)</option>
              </select>
              <input type="range" id="ci-alpha-slider" min="0.01" max="0.15" step="0.001" value="0.05" oninput="updateAlphaSlider()">
              <span class="ci-alpha-display" id="ci-alpha-display">0.050</span>
            </div>
          </div>
          
          <!-- POP SIZE Frame -->
          <div class="ci-section" id="ci-popsize-section">
            <div style="display: flex; align-items: center; gap: 10px;">
              <label style="color: rgba(255,255,255,0.6); font-size: 0.85em; text-transform: uppercase; font-weight: bold;">Pop. Size (opt):</label>
              <input type="number" id="ci-popsize-input" placeholder="Unknown" min="1" oninput="togglePopSizeRefresh()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: white; padding: 6px 10px; width: 120px;">
              <button id="ci-popsize-refresh" onclick="refreshPopSize()" class="ci-refresh-btn" style="display: none;">
                <i class="fa-solid fa-sync-alt"></i> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Results Panel -->
      <div class="ci-results-panel" id="ci-results-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: rgb(255,165,120); font-size: 1.1em; font-weight: 600;">Margin of Errors</h3>
          <div id="ci-method-badge" style="padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background: linear-gradient(135deg, rgba(120,200,255,0.2), rgba(120,200,255,0.15)); border: 1px solid rgb(120,200,255); color: rgb(120,200,255);">
            Classical
          </div>
        </div>
        
        <!-- Parameter Label -->
        <div style="text-align: center; margin-bottom: 8px;">
          <span id="ci-parameter-label" style="color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Mean
          </span>
        </div>
        
        <div class="ci-result-large">
          <span id="ci-mean-value">—</span>
          <span class="ci-plus-minus" id="ci-plus-minus">±</span>
          <span id="ci-margin-value">—</span>
        </div>
        
        <div class="ci-confidence-bar-container">
          <div class="ci-confidence-bar" id="ci-confidence-bar">
            <div class="ci-delta-label left" id="ci-delta-left">—</div>
            <div class="ci-delta-label right" id="ci-delta-right">—</div>
          </div>
          <div class="ci-confidence-marker"></div>
        </div>
        
        <div class="ci-stats-grid">
          <div class="ci-stat-box">
            <div class="ci-stat-label">Lower Limit (LCL)</div>
            <div class="ci-stat-value" id="ci-lcl-value">—</div>
          </div>
          <div class="ci-stat-box">
            <div class="ci-stat-label">Point Estimate</div>
            <div class="ci-stat-value" id="ci-center-value">—</div>
          </div>
          <div class="ci-stat-box">
            <div class="ci-stat-label">Upper Limit (UCL)</div>
            <div class="ci-stat-value" id="ci-ucl-value">—</div>
          </div>
          <div class="ci-stat-box">
            <div class="ci-stat-label">Sample Size (n)</div>
            <div class="ci-stat-value" id="ci-sample-size">${n}</div>
          </div>
          <div class="ci-stat-box">
            <div class="ci-stat-label">Confidence Level</div>
            <div class="ci-stat-value" id="ci-confidence-level">95%</div>
          </div>
          <div class="ci-stat-box">
            <div class="ci-stat-label">Decimals</div>
            <div class="ci-stat-value">
              <select id="ci-decimals" onchange="calculateCI()" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px; width: 60px;">
                <option value="2" selected>2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="ci-interpretation" id="ci-interpretation">
          <i class="fa-solid fa-info-circle" style="color: rgb(120,200,255); margin-right: 6px;"></i>
          Configure parameters to see confidence interval.
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    updateMethodBadge(currentMethod);
    updateResultsPanelStyle(currentMethod);
    updateParameterLabel();
    updateMethodVisibility();
    calculateCI();
  }, 100);
}

/**
 * Select method (classical or bootstrap)
 */
function selectMethod(method) {
  currentMethod = method;
  
  // Show confirmation notice when Bootstrap is selected
  if (method === 'bootstrap') {
    showBootstrapNotice();
  }
  
  // Update method badge
  updateMethodBadge(method);
  
  // Update results panel styling
  updateResultsPanelStyle(method);
  
  updateMethodVisibility();
  calculateCI();
}

/**
 * Show Bootstrap confirmation notice
 */
function showBootstrapNotice() {
  // Create or get notice element
  let notice = document.getElementById('ci-bootstrap-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'ci-bootstrap-notice';
    notice.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, rgba(255,165,120,0.95), rgba(255,140,90,0.95));
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(255,165,120,0.4);
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideInRight 0.3s ease;
    `;
    document.body.appendChild(notice);
  }
  
  notice.innerHTML = `
    <i class="fa-solid fa-sync-alt fa-spin" style="font-size: 16px;"></i>
    <span>Bootstrap Method Selected - Resampling will be performed</span>
  `;
  notice.style.display = 'flex';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notice.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      notice.style.display = 'none';
      notice.style.animation = 'slideInRight 0.3s ease';
    }, 300);
  }, 3000);
}

/**
 * Update method badge in results panel
 */
function updateMethodBadge(method) {
  const badge = document.getElementById('ci-method-badge');
  if (badge) {
    if (method === 'bootstrap') {
      badge.textContent = 'Bootstrap';
      badge.style.background = 'linear-gradient(135deg, rgba(255,165,120,0.3), rgba(255,140,90,0.2))';
      badge.style.borderColor = 'rgb(255,165,120)';
      badge.style.color = 'rgb(255,165,120)';
    } else {
      badge.textContent = 'Classical';
      badge.style.background = 'linear-gradient(135deg, rgba(120,200,255,0.2), rgba(120,200,255,0.15))';
      badge.style.borderColor = 'rgb(120,200,255)';
      badge.style.color = 'rgb(120,200,255)';
    }
  }
}

/**
 * Update results panel styling based on method
 */
function updateResultsPanelStyle(method) {
  const panel = document.getElementById('ci-results-panel');
  if (panel) {
    if (method === 'bootstrap') {
      // Subtle orange glow for bootstrap
      panel.style.borderColor = 'rgba(255,165,120,0.4)';
      panel.style.boxShadow = '0 4px 20px rgba(255,165,120,0.15), inset 0 0 0 2px rgba(255,165,120,0.25)';
    } else {
      // Default cyan glow for classical
      panel.style.borderColor = 'rgba(255,255,255,0.25)';
      panel.style.boxShadow = 'none';
    }
  }
}

/**
 * Select parameter
 */
function selectParameter(param) {
  // Check if parameter is disabled
  const radio = document.querySelector(`input[name="ci-parameter"][value="${param}"]`);
  if (radio && radio.disabled) return;
  
  currentParameter = param;
  updateParameterLabel(); // Update the parameter label when parameter changes
  updateParameterVisibility();
  calculateCI();
}

/**
 * Update visibility based on method selection
 */
function updateMethodVisibility() {
  const isBootstrap = currentMethod === 'bootstrap';
  
  // Show/hide bootstrap iterations
  const iterationsControl = document.getElementById('ci-bootstrap-iterations');
  if (iterationsControl) {
    iterationsControl.classList.toggle('active', isBootstrap);
  }
  
  // Enable/disable median and percentile for bootstrap
  const medianOption = document.getElementById('ci-median-option');
  const percentileOption = document.getElementById('ci-percentile-option');
  const medianRadio = document.querySelector('input[name="ci-parameter"][value="median"]');
  const percentileRadio = document.querySelector('input[name="ci-parameter"][value="percentile"]');
  
  if (isBootstrap) {
    if (medianOption) medianOption.classList.remove('disabled');
    if (percentileOption) percentileOption.classList.remove('disabled');
    if (medianRadio) medianRadio.disabled = false;
    if (percentileRadio) percentileRadio.disabled = false;
  } else {
    if (medianOption) medianOption.classList.add('disabled');
    if (percentileOption) percentileOption.classList.add('disabled');
    if (medianRadio) medianRadio.disabled = true;
    if (percentileRadio) percentileRadio.disabled = true;
    
    // Reset to mean if median or percentile was selected
    if (currentParameter === 'median' || currentParameter === 'percentile') {
      const meanRadio = document.querySelector('input[name="ci-parameter"][value="mean"]');
      if (meanRadio) meanRadio.checked = true;
      currentParameter = 'mean';
    }
    
    // Hide percentile input
    const percentileControl = document.getElementById('ci-percentile-value');
    if (percentileControl) percentileControl.classList.remove('active');
  }
  
  // Enable/disable pop size (only for classical mean)
  updatePopSizeVisibility();
}

/**
 * Update visibility based on parameter selection
 */
function updateParameterVisibility() {
  // Show/hide percentile value input
  const percentileControl = document.getElementById('ci-percentile-value');
  if (percentileControl) {
    percentileControl.classList.toggle('active', currentParameter === 'percentile');
  }
  
  // Update parameter label
  updateParameterLabel();
  
  updatePopSizeVisibility();
}

/**
 * Update parameter label above the result value
 */
function updateParameterLabel() {
  const label = document.getElementById('ci-parameter-label');
  if (!label) return;
  
  if (currentParameter === 'percentile') {
    const percentileInput = document.getElementById('ci-percentile-input');
    const pValue = percentileInput ? parseFloat(percentileInput.value) : 50;
    label.textContent = `${pValue}th Percentile`;
  } else {
    const paramLabels = {
      mean: 'Mean',
      stdev: 'Standard Deviation',
      median: 'Median',
      variance: 'Variance'
    };
    label.textContent = paramLabels[currentParameter] || currentParameter;
  }
}

/**
 * Update pop size visibility (only for classical mean)
 */
function updatePopSizeVisibility() {
  const enablePopSize = currentMethod === 'classical' && currentParameter === 'mean';
  const popSizeInput = document.getElementById('ci-popsize-input');
  const popSizeSection = document.getElementById('ci-popsize-section');
  
  if (popSizeInput && popSizeSection) {
    if (enablePopSize) {
      popSizeInput.disabled = false;
      popSizeInput.style.opacity = '1';
      popSizeInput.style.cursor = 'text';
      popSizeSection.style.opacity = '1';
    } else {
      popSizeInput.disabled = true;
      popSizeInput.style.opacity = '0.5';
      popSizeInput.style.cursor = 'not-allowed';
      popSizeSection.style.opacity = '0.5';
      
      // Hide refresh button
      const refreshBtn = document.getElementById('ci-popsize-refresh');
      if (refreshBtn) refreshBtn.style.display = 'none';
    }
  }
}

/**
 * Toggle pop size refresh button visibility
 */
function togglePopSizeRefresh() {
  const popInput = document.getElementById('ci-popsize-input');
  const refreshBtn = document.getElementById('ci-popsize-refresh');
  if (popInput && refreshBtn) {
    const hasValue = popInput.value !== '' && !isNaN(popInput.value);
    const isEnabled = currentMethod === 'classical' && currentParameter === 'mean';
    refreshBtn.style.display = (hasValue && isEnabled) ? 'inline-flex' : 'none';
  }
}

/**
 * Refresh with current iterations
 */
function refreshIterations() {
  const btn = document.querySelector('#ci-bootstrap-iterations button');
  if (!btn) return;
  
  // Show calculating state
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';
  btn.disabled = true;
  btn.style.opacity = '0.7';
  
  console.log('🔄 Refreshing Bootstrap with new iterations');
  
  // Use setTimeout to allow UI to update before heavy calculation
  setTimeout(() => {
    calculateCI();
    
    // Show success state
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Complete!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    // Reset after 1.5 seconds
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.background = 'linear-gradient(135deg, var(--accent-1), rgb(255,140,90))';
    }, 1500);
  }, 50);
}

/**
 * Refresh with current percentile
 */
function refreshPercentile() {
  const btn = document.querySelector('#ci-percentile-value button');
  if (!btn) return;
  
  // Show calculating state
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';
  btn.disabled = true;
  btn.style.opacity = '0.7';
  
  console.log('🔄 Refreshing Bootstrap percentile');
  updateParameterLabel(); // Update label with new percentile value
  
  // Use setTimeout to allow UI to update before heavy calculation
  setTimeout(() => {
    calculateCI();
    
    // Show success state
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Complete!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    // Reset after 1.5 seconds
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.background = 'linear-gradient(135deg, var(--accent-1), rgb(255,140,90))';
    }, 1500);
  }, 50);
}

/**
 * Refresh with current pop size
 */
function refreshPopSize() {
  const btn = document.getElementById('ci-popsize-refresh');
  if (!btn) return;
  
  // Show calculating state
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  btn.disabled = true;
  btn.style.opacity = '0.7';
  
  console.log('🔄 Refreshing with population size');
  
  // Use setTimeout to allow UI to update
  setTimeout(() => {
    calculateCI();
    
    // Show success state
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Done';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    // Reset after 1.5 seconds
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.background = 'linear-gradient(135deg, var(--accent-1), rgb(255,140,90))';
    }, 1500);
  }, 50);
}

/**
 * Update alpha from slider
 */
function updateAlphaSlider() {
  const slider = document.getElementById('ci-alpha-slider');
  const alpha = parseFloat(slider.value);
  currentConfidence = (1 - alpha) * 100; // Keep as number, not string
  
  document.getElementById('ci-alpha-display').textContent = alpha.toFixed(3);
  document.getElementById('ci-confidence-level').textContent = currentConfidence.toFixed(1) + '%';
  
  console.log('🎚️ Alpha changed to:', alpha.toFixed(3), '→ Confidence:', currentConfidence.toFixed(1) + '%');
  calculateCI();
}

/**
 * Set alpha from preset dropdown
 */
function setAlphaPreset() {
  const select = document.getElementById('ci-alpha-preset');
  const alpha = parseFloat(select.value);
  currentConfidence = (1 - alpha) * 100; // Keep as number, not string
  
  document.getElementById('ci-alpha-slider').value = alpha;
  document.getElementById('ci-alpha-display').textContent = alpha.toFixed(3);
  document.getElementById('ci-confidence-level').textContent = currentConfidence.toFixed(1) + '%';
  
  console.log('🎚️ Alpha preset changed to:', alpha.toFixed(3), '→ Confidence:', currentConfidence.toFixed(1) + '%');
  calculateCI();
}

/**
 * Calculate confidence interval
 */
function calculateCI() {
  if (!resultsData || !resultsData.rawData) {
    console.warn('⚠️ calculateCI: No data available');
    return;
  }
  
  console.log('📊 Calculating CI - Method:', currentMethod, 'Parameter:', currentParameter, 'Confidence:', currentConfidence.toFixed(1) + '%');
  
  const results = currentMethod === 'classical' 
    ? calculateClassicalCI() 
    : calculateBootstrapCI();
  
  console.log('📐 Results:', {
    pointEstimate: results.pointEstimate.toFixed(4),
    lcl: results.lcl.toFixed(4),
    ucl: results.ucl.toFixed(4),
    width: (results.ucl - results.lcl).toFixed(4)
  });
  
  displayCIResults(results);
}

/**
 * Classical confidence interval - Matches 0confidence-interval.html exactly
 */
function calculateClassicalCI() {
  const data = resultsData.rawData;
  const n = data.length;
  const alpha = 1 - (currentConfidence / 100);
  
  let pointEstimate, lcl, ucl, margin, methodName;
  
  if (currentParameter === 'mean') {
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdev = Math.sqrt(variance);
    
    // Finite population correction factor (matching HTML version)
    let Factor = 1;
    const popInput = document.getElementById('ci-popsize-input');
    const populationSize = popInput && popInput.value ? parseInt(popInput.value) : null;
    
    if (populationSize && populationSize > n) {
      Factor = Math.sqrt((populationSize - n) / (populationSize - 1));
      console.log('  FPC applied:', Factor.toFixed(4));
    }
    
    // VB6: xlApp.TInv(alpha, n - 1) * Factor * Stdev / n ^ 0.5
    const tValue = getTValue(alpha / 2, n - 1);
    const marginOfError = tValue * Factor * stdev / Math.sqrt(n);
    
    // VB6: LCL = Average - TInv * Factor * Stdev / sqrt(n)
    // VB6: UCL = Average + TInv * Factor * Stdev / sqrt(n)
    pointEstimate = mean;
    lcl = mean - marginOfError;
    ucl = mean + marginOfError;
    margin = marginOfError;
    methodName = `t-distribution (df=${n-1})`;
    
  } else if (currentParameter === 'median') {
    // Median not supported in Classical method (use Bootstrap)
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    pointEstimate = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    
    // Use bootstrap instead
    lcl = pointEstimate;
    ucl = pointEstimate;
    margin = null;
    methodName = 'Use Bootstrap for Median';
    
  } else if (currentParameter === 'variance') {
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    
    // VB6: UCL = sqrt(((n - 1) * Stdev^2) / ChiInv(1 - alpha/2, n - 1))
    // VB6: LCL = sqrt(((n - 1) * Stdev^2) / ChiInv(alpha/2, n - 1))
    const chiUpper = getChiSquareValue(alpha / 2, n - 1);
    const chiLower = getChiSquareValue(1 - alpha / 2, n - 1);
    
    pointEstimate = variance;
    lcl = ((n - 1) * variance) / chiLower;
    ucl = ((n - 1) * variance) / chiUpper;
    margin = null; // Asymmetric interval
    methodName = `χ² distribution (df=${n-1})`;
    
  } else if (currentParameter === 'stdev') {
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdev = Math.sqrt(variance);
    
    // VB6: UCL = sqrt(((n - 1) * Stdev^2) / ChiInv(1 - alpha/2, n - 1))
    // VB6: LCL = sqrt(((n - 1) * Stdev^2) / ChiInv(alpha/2, n - 1))
    const chiUpper = getChiSquareValue(alpha / 2, n - 1);
    const chiLower = getChiSquareValue(1 - alpha / 2, n - 1);
    
    pointEstimate = stdev;
    lcl = Math.sqrt(((n - 1) * variance) / chiLower);
    ucl = Math.sqrt(((n - 1) * variance) / chiUpper);
    margin = null; // Asymmetric interval
    methodName = `χ² distribution (df=${n-1})`;
  }
  
  return { pointEstimate, lcl, ucl, margin, methodName };
}

/**
 * Bootstrap confidence interval - Matches 0confidence-interval.html exactly
 */
function calculateBootstrapCI() {
  const data = resultsData.rawData;
  const intBootstrapN = data.length;  // VB6: intBootstrapN = 1 * Me.Ssize
  
  // Get iterations from input (matching HTML version)
  const iterationsInput = document.getElementById('ci-iterations-input');
  const intIteration = iterationsInput ? parseInt(iterationsInput.value) || 500 : 500;
  
  const alpha = 1 - (currentConfidence / 100);
  
  console.log(`✓ Bootstrap - ${currentParameter} calculation with ${intIteration} iterations (VB6 version)`);
  
  // VB6: ReDim hold2(intIteration) - Array for bootstrapped statistics
  const hold2 = [];
  
  // VB6: Randomize and resample loop
  for (let j = 0; j < intIteration; j++) {
    // VB6: ReDim hold(intBootstrapN) - Bootstrapped array
    const hold = [];
    
    // VB6: For i = 1 To intBootstrapN
    //        a = Rnd
    //        hold(i) = Victor1(Int(a * UBound(Victor1) + 1))
    //      Next i
    for (let i = 0; i < intBootstrapN; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      hold.push(data[randomIndex]);
    }
    
    // VB6: Calculate statistic for this resample
    let stat;
    if (currentParameter === 'mean') {
      // VB6: If Me.OpParameter(0).Value = True Then hold2(j) = Statsmain.Average(hold)
      stat = calculateMean(hold);
    } else if (currentParameter === 'stdev') {
      // VB6: If Me.OpParameter(1).Value = True Then hold2(j) = Statsmain.Stdev(hold)
      const mean = calculateMean(hold);
      stat = calculateStdev(hold, mean);
    } else if (currentParameter === 'median') {
      // VB6: If Me.OpParameter(2).Value = True Then hold2(j) = CalculateMedian10(hold)
      stat = calculateMedian(hold);
    } else if (currentParameter === 'percentile') {
      // VB6: If Me.OpParameter(3).Value = True Then hold2(j) = CalculatePercentileBase1(hold, intBootstrapN, Me.PercentileValue / 100, sss)
      const percentileInput = document.getElementById('ci-percentile-input');
      const p = percentileInput ? parseFloat(percentileInput.value) / 100 : 0.5;
      stat = calculatePercentile(hold, p);
      if (j === 0) console.log(`  Percentile: ${(p * 100).toFixed(0)}%`);
    } else if (currentParameter === 'variance') {
      const mean = calculateMean(hold);
      stat = calculateVariance(hold, mean);
    }
    
    hold2.push(stat);
  }
  
  // VB6: AverageB = Statsmain.Average(hold2)
  const AverageB = calculateMean(hold2);
  
  // VB6: UCLM = xlApp.Percentile(hold2, 1 - (alpha / 2))
  // VB6: LCLM = xlApp.Percentile(hold2, alpha / 2)
  hold2.sort((a, b) => a - b);
  const LCLM = calculatePercentile(hold2, alpha / 2);
  const UCLM = calculatePercentile(hold2, 1 - alpha / 2);
  
  console.log(`  Center (AverageB): ${AverageB.toFixed(4)}, LCL: ${LCLM.toFixed(4)}, UCL: ${UCLM.toFixed(4)}`);
  
  return {
    pointEstimate: AverageB,
    lcl: LCLM,
    ucl: UCLM,
    margin: null, // Bootstrap uses asymmetric intervals
    methodName: `Bootstrap (${intIteration} replicates)`
  };
}

/**
 * Display CI results - Matches 0confidence-interval.html display exactly
 */
function displayCIResults(results) {
  const { pointEstimate, lcl, ucl, methodName, margin } = results;
  const decimals = parseInt(document.getElementById('ci-decimals')?.value || 2);
  
  // Update main display
  document.getElementById('ci-center-value').textContent = pointEstimate.toFixed(decimals);
  document.getElementById('ci-mean-value').textContent = pointEstimate.toFixed(decimals);
  
  // Show/hide ± symbol based on whether margin is available
  const plusMinus = document.getElementById('ci-plus-minus');
  const marginValue = document.getElementById('ci-margin-value');
  
  if (margin !== null && margin !== undefined) {
    plusMinus.style.display = 'inline';
    marginValue.style.display = 'inline';
    marginValue.textContent = margin.toFixed(decimals);
  } else {
    plusMinus.style.display = 'none';
    marginValue.style.display = 'none';
  }
  
  // Update LCL/UCL
  document.getElementById('ci-lcl-value').textContent = lcl.toFixed(decimals);
  document.getElementById('ci-ucl-value').textContent = ucl.toFixed(decimals);
  
  // Update confidence bar (dynamic positioning with improved scaling)
  const range = ucl - lcl;
  const center = pointEstimate;
  
  // Use adaptive scaling to give ~50% bar width at alpha=0.05 (95% confidence)
  // The bar width will vary based on confidence level to show changes clearly
  const alpha = 1 - (currentConfidence / 100);
  const baseMultiplier = 0.9; // Base scaling
  const alphaAdjustment = alpha * 2.0; // Strong adjustment based on alpha
  const visualHalfRange = range * (baseMultiplier + alphaAdjustment);
  
  const visualMin = center - visualHalfRange;
  const visualMax = center + visualHalfRange;
  const totalVisualRange = visualMax - visualMin;
  
  const lclPercent = ((lcl - visualMin) / totalVisualRange) * 100;
  const uclPercent = ((ucl - visualMin) / totalVisualRange) * 100;
  const width = Math.max(0, Math.min(100, uclPercent - lclPercent));
  
  const bar = document.getElementById('ci-confidence-bar');
  const leftPos = Math.max(0, Math.min(100 - width, lclPercent));
  
  console.log('📏 Bar Update:', {
    range: range.toFixed(4),
    width: width.toFixed(2) + '%',
    left: leftPos.toFixed(2) + '%',
    lcl: lcl.toFixed(4),
    ucl: ucl.toFixed(4)
  });
  
  // Force style update with setProperty to ensure it takes effect
  bar.style.setProperty('left', leftPos + '%', 'important');
  bar.style.setProperty('width', width + '%', 'important');
  
  // Force reflow to ensure style is applied
  void bar.offsetWidth;
  
  // Update bar color based on method
  if (currentMethod === 'bootstrap') {
    bar.classList.add('bootstrap');
  } else {
    bar.classList.remove('bootstrap');
  }
  
  // Update delta labels
  const deltaLeft = Math.abs(pointEstimate - lcl);
  const deltaRight = Math.abs(ucl - pointEstimate);
  document.getElementById('ci-delta-left').textContent = '−' + deltaLeft.toFixed(decimals);
  document.getElementById('ci-delta-right').textContent = '+' + deltaRight.toFixed(decimals);
  
  // Update interpretation
  updateInterpretation(pointEstimate, lcl, ucl, margin, decimals);
}

/**
 * Update interpretation text
 */
function updateInterpretation(pointEstimate, lcl, ucl, margin, decimals) {
  const confidenceLevel = currentConfidence;
  const paramLabels = {
    mean: 'mean',
    stdev: 'standard deviation',
    median: 'median',
    variance: 'variance',
    percentile: 'percentile'
  };
  let paramName = paramLabels[currentParameter] || currentParameter;
  
  // For percentile, include the specific value
  if (currentParameter === 'percentile') {
    const percentileInput = document.getElementById('ci-percentile-input');
    const pValue = percentileInput ? parseFloat(percentileInput.value) : 50;
    paramName = `${pValue}th percentile`;
  }
  
  let interpretation = '';
  
  if (currentMethod === 'classical') {
    const popInput = document.getElementById('ci-popsize-input');
    const populationSize = popInput && popInput.value ? parseInt(popInput.value) : null;
    const fpcNote = (populationSize && currentParameter === 'mean') 
      ? ` <i class="fa-solid fa-info-circle" style="color: rgb(120,200,255);"></i> FPC applied (N=${populationSize}).` 
      : '';
    
    interpretation = `
      <i class="fa-solid fa-check-circle" style="color: rgb(120,200,255); margin-right: 6px;"></i>
      We are <strong style="color: rgb(255,165,120);">${confidenceLevel}% confident</strong> that the true population ${paramName} 
      lies between <strong style="color: rgb(120,200,255);">${lcl.toFixed(decimals)}</strong> and 
      <strong style="color: rgb(120,200,255);">${ucl.toFixed(decimals)}</strong>.
      ${margin ? ` Margin of error: <strong style="color: rgb(255,165,120);">±${margin.toFixed(decimals)}</strong>.` : ''}
      ${fpcNote}
    `;
  } else {
    const iterationsInput = document.getElementById('ci-iterations-input');
    const iterations = iterationsInput ? parseInt(iterationsInput.value) || 500 : 500;
    
    interpretation = `
      <i class="fa-solid fa-check-circle" style="color: rgb(120,200,255); margin-right: 6px;"></i>
      Based on <strong style="color: rgb(255,165,120);">${iterations} resamples</strong>, 
      we are <strong style="color: rgb(255,165,120);">${confidenceLevel}% confident</strong> that the true population ${paramName} 
      lies between <strong style="color: rgb(120,200,255);">${lcl.toFixed(decimals)}</strong> and 
      <strong style="color: rgb(120,200,255);">${ucl.toFixed(decimals)}</strong>.
      Bootstrap estimate: <strong>${pointEstimate.toFixed(decimals)}</strong>.
    `;
  }
  
  document.getElementById('ci-interpretation').innerHTML = interpretation;
}

// ============================================
// HELPER FUNCTIONS - Match 0confidence-interval.html exactly
// ============================================

function calculateMean(data) {
  if (!data || data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

function calculateStdev(data, mean) {
  if (!data || data.length < 2) return 0;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
}

function calculateVariance(data, mean) {
  if (!data || data.length < 2) return 0;
  return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
}

function calculateMedian(data) {
  if (!data || data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculatePercentile(data, p) {
  if (!data || data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Statistical functions - VB6 Excel compatibility (from HTML version)
// VB6 uses: xlApp.TInv(alpha, n - 1)
// Excel's TINV returns two-tailed t-value
function getTValue(p, df) {
  // t-distribution approximation
  // For df > 30, use normal approximation
  if (df > 30) {
    return normalInv(1 - p);
  }
  
  // For smaller df, use improved approximation
  // This matches Excel's TINV function more closely
  const z = normalInv(1 - p);
  const g1 = (z * z * z + z) / 4;
  const g2 = (5 * z * z * z * z * z + 16 * z * z * z + 3 * z) / 96;
  const g3 = (3 * Math.pow(z, 7) + 19 * Math.pow(z, 5) + 17 * z * z * z - 15 * z) / 384;
  const g4 = (79 * Math.pow(z, 9) + 776 * Math.pow(z, 7) + 1482 * Math.pow(z, 5) - 1920 * z * z * z - 945 * z) / 92160;
  
  return z + g1 / df + g2 / (df * df) + g3 / (df * df * df) + g4 / (df * df * df * df);
}

function normalInv(p) {
  // Approximation of inverse normal CDF (from HTML version)
  if (p <= 0 || p >= 1) return 0;
  
  const a1 = -3.969683028665376e+01;
  const a2 =  2.209460984245205e+02;
  const a3 = -2.759285104469687e+02;
  const a4 =  1.383577518672690e+02;
  const a5 = -3.066479806614716e+01;
  const a6 =  2.506628277459239e+00;
  
  const b1 = -5.447609879822406e+01;
  const b2 =  1.615858368580409e+02;
  const b3 = -1.556989798598866e+02;
  const b4 =  6.680131188771972e+01;
  const b5 = -1.328068155288572e+01;
  
  const c1 = -7.784894002430293e-03;
  const c2 = -3.223964580411365e-01;
  const c3 = -2.400758277161838e+00;
  const c4 = -2.549732539343734e+00;
  const c5 =  4.374664141464968e+00;
  const c6 =  2.938163982698783e+00;
  
  const d1 =  7.784695709041462e-03;
  const d2 =  3.224671290700398e-01;
  const d3 =  2.445134137142996e+00;
  const d4 =  3.754408661907416e+00;
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q, r, result;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    result = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    result = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
            (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    result = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
             ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  
  return result;
}

// VB6 uses: xlApp.ChiInv(probability, df)
// Excel's CHIINV returns the inverse of the right-tailed chi-square distribution
function getChiSquareValue(p, df) {
  // Chi-square inverse using Wilson-Hilferty transformation
  // This approximation matches Excel's CHIINV function
  if (p <= 0 || p >= 1) return df;
  
  const z = normalInv(p);
  
  // Wilson-Hilferty transformation for chi-square
  const h = 2 / (9 * df);
  const chiSq = df * Math.pow(1 - h + z * Math.sqrt(h), 3);
  
  // Ensure positive value and reasonable bounds
  return Math.max(0.001, Math.min(chiSq, df * 10));
}

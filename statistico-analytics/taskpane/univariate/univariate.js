/* global Office, Excel, initDataInputPanel, getCurrentRangeData */

/**
 * ================================================================
 * UNIVARIATE ANALYSIS MODULE
 * ================================================================
 * Uses shared Data Input Panel component
 * Includes variable selection, trim, transform, and live stats
 * ================================================================
 */

// Global state
let rawData = null;  // Original 2D array from Excel
let currentColumn = null;  // Currently selected column index
let currentData = [];  // Current numeric data (after column selection)
let trimMin = 0;
let trimMax = 100;
let currentTransform = 'none';

// Initialize when Office is ready
Office.onReady(async (info) => {
    if (info.host === Office.HostType.Excel) {
        console.log('Univariate Analysis module loaded');
        await loadDataInputPanel();
        await initDataInputPanel();
        initializeUI();
    }
});

/**
 * Load the shared data input panel HTML
 */
async function loadDataInputPanel() {
    try {
        const container = document.getElementById('dataInputContainer');
        const response = await fetch('../../src/shared/components/data-input-panel.html');
        const html = await response.text();
        container.innerHTML = html;
    } catch (error) {
        showStatus('error', 'Failed to load data input panel: ' + error.message);
    }
}

/**
 * Initialize UI event listeners
 */
function initializeUI() {
    // Variable selection
    document.getElementById('ddlVariable').addEventListener('change', onVariableChange);
    
    // Trim sliders
    document.getElementById('slMin').addEventListener('input', onTrimChange);
    document.getElementById('slMax').addEventListener('input', onTrimChange);
    
    // Transform options
    document.querySelectorAll('input[name="transform"]').forEach(radio => {
        radio.addEventListener('change', onTransformChange);
    });
    
    // Radio button visual selection
    document.querySelectorAll('.radgrid .opt').forEach(opt => {
        opt.addEventListener('click', function() {
            document.querySelectorAll('.radgrid .opt').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

/**
 * Navigate back to hub
 */
function goBack() {
    window.location.href = '../hub.html';
}

/**
 * Handle data loading from the shared component
 */
function onRangeDataLoaded(values, address) {
    rawData = values;
    
    console.log('Data loaded:', { 
        rows: values.length, 
        cols: values[0]?.length || 0,
        address: address 
    });
    
    // Populate variable dropdown
    populateVariableDropdown(values);
    
    showStatus('success', `Data loaded from ${address}. Select a column to analyze.`);
}

/**
 * Populate the variable dropdown with column headers
 */
function populateVariableDropdown(data) {
    const dropdown = document.getElementById('ddlVariable');
    dropdown.innerHTML = '<option value="">Select Column</option>';
    
    if (!data || data.length === 0) return;
    
    const numCols = data[0].length;
    const headers = data[0];  // First row as headers
    
    for (let i = 0; i < numCols; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = headers[i] || `Column ${i + 1}`;
        dropdown.appendChild(option);
    }
}

/**
 * Handle variable selection change
 */
function onVariableChange() {
    const dropdown = document.getElementById('ddlVariable');
    const colIndex = parseInt(dropdown.value);
    const runButton = document.getElementById('runButton');
    
    if (isNaN(colIndex) || !rawData) {
        currentColumn = null;
        currentData = [];
        if (runButton) runButton.disabled = true;
        updateStats();
        return;
    }
    
    currentColumn = colIndex;
    
    // Clear old localStorage data when changing columns
    localStorage.removeItem('univariateResults');
    console.log('🗑️ Cleared old localStorage data for new column selection');
    
    // Extract column data (skip header row)
    const columnValues = rawData.slice(1).map(row => row[colIndex]);
    
    // Filter numeric values
    currentData = columnValues
        .filter(v => v !== '' && v !== null && !isNaN(parseFloat(v)))
        .map(v => parseFloat(v));
    
    if (currentData.length === 0) {
        showStatus('error', 'No valid numeric data in selected column');
        if (runButton) runButton.disabled = true;
        return;
    }
    
    // Enable Run button
    if (runButton) runButton.disabled = false;
    
    // Enable tabs
    const trimTab = document.getElementById('tab-trim');
    const transformTab = document.getElementById('tab-transform');
    if (trimTab) trimTab.classList.remove('disabled');
    if (transformTab) transformTab.classList.remove('disabled');
    
    // Reset trim and transform
    resetTrim();
    currentTransform = 'none';
    
    // Safely reset transform selection
    const noneInput = document.querySelector('input[value="none"]');
    if (noneInput) {
        noneInput.checked = true;
        const parentOpt = noneInput.closest('.opt');
        if (parentOpt) {
            document.querySelectorAll('.radgrid .opt').forEach(o => o.classList.remove('selected'));
            parentOpt.classList.add('selected');
        }
    }
    
    // Update stats
    updateStats();
    updateSummary();
    
    // Scroll to show Summary section
    setTimeout(() => {
        const summarySection = document.getElementById('panel-summary');
        if (summarySection) {
            summarySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
    // Check if tab is disabled
    const btn = document.getElementById(`tab-${tabName}`);
    if (btn && btn.classList.contains('disabled')) {
        return;
    }
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Update panels
    document.querySelectorAll('.tab-content > div').forEach(panel => {
        panel.style.display = 'none';
    });
    const panel = document.getElementById(`panel-${tabName}`);
    if (panel) {
        panel.style.display = 'block';
    }
}

/**
 * Update stats footer notice
 */
function updateStatsFooter(isTrimmed, isTransformed) {
    const footer = document.getElementById('stats-footer');
    if (!footer) return;
    
    if (!isTrimmed && !isTransformed) {
        footer.style.display = 'none';
        return;
    }
    
    let message = '* ';
    const modifications = [];
    if (isTrimmed) modifications.push('trimmed');
    if (isTransformed) modifications.push('transformed');
    message += 'Data has been ' + modifications.join(' and ');
    
    footer.textContent = message;
    footer.style.display = 'block';
}

/**
 * Handle trim slider changes
 */
function onTrimChange() {
    trimMin = parseInt(document.getElementById('slMin').value);
    trimMax = parseInt(document.getElementById('slMax').value);
    
    // Update slider gradients (inverse colors - orange = kept data)
    const slMin = document.getElementById('slMin');
    const slMax = document.getElementById('slMax');
    slMin.style.setProperty('--trim-left-percent', trimMin + '%');
    slMax.style.setProperty('--trim-right-percent', trimMax + '%');
    
    if (currentData.length === 0) return;
    
    const sorted = [...currentData].sort((a, b) => a - b);
    const minVal = sorted[Math.floor((sorted.length - 1) * trimMin / 100)];
    const maxVal = sorted[Math.floor((sorted.length - 1) * trimMax / 100)];
    
    document.getElementById('lblMin').textContent = minVal.toFixed(2);
    document.getElementById('lblMax').textContent = maxVal.toFixed(2);
    
    updateStats();
}

/**
 * Reset trim sliders
 */
function resetTrim() {
    trimMin = 0;
    trimMax = 100;
    const slMin = document.getElementById('slMin');
    const slMax = document.getElementById('slMax');
    slMin.value = 0;
    slMax.value = 100;
    
    // Reset gradients
    slMin.style.setProperty('--trim-left-percent', '0%');
    slMax.style.setProperty('--trim-right-percent', '100%');
    
    document.getElementById('lblMin').textContent = '—';
    document.getElementById('lblMax').textContent = '—';
    updateStats();
}

/**
 * Handle transform selection change
 */
function onTransformChange(e) {
    currentTransform = e.target.value;
    updateStats();
}

/**
 * Update basic stats display
 */
function updateStats() {
    if (currentData.length === 0) {
        document.getElementById('stat-n').textContent = '—';
        document.getElementById('stat-mean').textContent = '—';
        document.getElementById('stat-median').textContent = '—';
        document.getElementById('stat-std').textContent = '—';
        document.getElementById('stat-min').textContent = '—';
        document.getElementById('stat-max').textContent = '—';
        updateStatsFooter(false, false);
        return;
    }
    
    // Apply trim
    const sorted = [...currentData].sort((a, b) => a - b);
    const minIdx = Math.floor((sorted.length - 1) * trimMin / 100);
    const maxIdx = Math.floor((sorted.length - 1) * trimMax / 100);
    let trimmedData = sorted.slice(minIdx, maxIdx + 1);
    
    // Track if modifications are applied
    const isTrimmed = (trimMin > 0 || trimMax < 100);
    const isTransformed = (currentTransform !== 'none');
    
    // Apply transform to the data
    if (isTransformed) {
        trimmedData = applyTransform(trimmedData, currentTransform);
    }
    
    // Calculate stats (WITH transform applied)
    const n = trimmedData.length;
    const sum = trimmedData.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    const variance = trimmedData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    const median = quantile(trimmedData, 0.5);
    const min = Math.min(...trimmedData);
    const max = Math.max(...trimmedData);
    
    // Update display with asterisk if modified
    const nDisplay = isTrimmed || isTransformed ? n + '*' : n;
    document.getElementById('stat-n').innerHTML = nDisplay;
    document.getElementById('stat-mean').textContent = mean.toFixed(2);
    document.getElementById('stat-median').textContent = median.toFixed(2);
    document.getElementById('stat-std').textContent = stdDev.toFixed(2);
    document.getElementById('stat-min').textContent = min.toFixed(2);
    document.getElementById('stat-max').textContent = max.toFixed(2);
    
    // Update footer notice
    updateStatsFooter(isTrimmed, isTransformed);
}

/**
 * Update dataset summary tab
 */
function updateSummary() {
    if (currentData.length === 0) return;
    
    const summaryElement = document.getElementById('summaryContent');
    if (!summaryElement) return; // Element doesn't exist, skip update
    
    const sorted = [...currentData].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    const summaryHTML = `
        <div style="font-size: 11px; line-height: 1.6;">
            <strong style="color: var(--accent-1);">Column selected</strong><br/>
            <span style="color: var(--text-secondary);">
                ✓ ${n} valid numeric values<br/>
                ✓ Range: ${sorted[0].toFixed(2)} to ${sorted[n-1].toFixed(2)}<br/>
                ✓ Mean: ${mean.toFixed(2)}<br/>
            </span>
        </div>
    `;
    
    summaryElement.innerHTML = summaryHTML;
}

/**
 * Run the full analysis
 */
async function runAnalysis() {
    const runButton = document.getElementById('runButton');
    
    // Get data
    const { values, address } = getCurrentRangeData();
    
    // Validate
    if (!values || values.length === 0) {
        showStatus('error', 'Please select data first using one of the three options above');
        return;
    }
    
    if (currentColumn === null || currentData.length === 0) {
        showStatus('error', 'Please select a column to analyze');
        return;
    }
    
    // Disable button
    runButton.disabled = true;
    runButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Running...</span>';
    
    try {
        console.log('🎯 Running analysis for column:', currentColumn, 'with', currentData.length, 'values');
        console.log('📊 First few values:', currentData.slice(0, 5));
        
        // Apply trim by value range (keeping original order)
        let processedData = currentData;
        if (trimMin > 0 || trimMax < 100) {
            const sorted = [...currentData].sort((a, b) => a - b);
            const minIdx = Math.floor((sorted.length - 1) * trimMin / 100);
            const maxIdx = Math.floor((sorted.length - 1) * trimMax / 100);
            const minValue = sorted[minIdx];
            const maxValue = sorted[maxIdx];
            // Filter by value range while preserving original order
            processedData = currentData.filter(v => v >= minValue && v <= maxValue);
        }
        
        // Apply transform
        processedData = applyTransform(processedData, currentTransform);
        
        // Calculate statistics
        const results = calculateStatistics(processedData, address, currentTransform);
        console.log('📈 Results calculated for:', results.column);
        
        // Open results in Office Dialog
        openResultsDialog(results);
        
        showStatus('success', 'Analysis complete! Results opened in new window.');
        
    } catch (error) {
        showStatus('error', 'Analysis failed: ' + error.message);
    } finally {
        runButton.disabled = false;
        runButton.innerHTML = '<i class="fa-solid fa-play"></i><span>Run Full Analysis</span>';
    }
}

/**
 * Apply transformation to data
 */
function applyTransform(data, transform) {
    switch (transform) {
        case 'ln':
            return data.map(v => Math.log(v));
        case 'log10':
            return data.map(v => Math.log10(v));
        case 'sqrt':
            return data.map(v => Math.sqrt(v));
        case 'square':
            return data.map(v => v * v);
        case 'reciprocal':
            return data.map(v => 1 / v);
        case 'z':
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            const stdDev = Math.sqrt(data.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / data.length);
            return data.map(v => (v - mean) / stdDev);
        case 'minmax':
            const min = Math.min(...data);
            const max = Math.max(...data);
            return data.map(v => (v - min) / (max - min));
        default:
            return data;
    }
}

/**
 * Calculate descriptive statistics
 */
function calculateStatistics(data, address, transform) {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    const q1 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const q3 = quantile(sorted, 0.75);
    
    const skewness = calculateSkewness(data, mean, stdDev);
    const kurtosis = calculateKurtosis(data, mean, stdDev);
    
    // Get column name from dropdown
    const dropdown = document.getElementById('ddlVariable');
    const columnName = dropdown.options[dropdown.selectedIndex]?.text || 'Variable';
    
    console.log('📋 calculateStatistics - Column name:', columnName, 'Index:', dropdown.selectedIndex);
    
    return {
        dataSource: address,
        column: columnName,
        columnIndex: currentColumn,
        transform: transform,
        trim: { min: trimMin, max: trimMax },
        n: n,
        values: data, // Include processed data for all views
        rawData: data, // Keep for backward compatibility
        descriptive: {
            mean: mean,
            median: median,
            stdDev: stdDev,
            variance: variance,
            min: min,
            max: max,
            range: (max - min),
            q1: q1,
            q3: q3,
            iqr: (q3 - q1),
            skewness: skewness,
            kurtosis: kurtosis
        }
    };
}

function quantile(sortedData, q) {
    const pos = (sortedData.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sortedData[base + 1] !== undefined 
        ? sortedData[base] + rest * (sortedData[base + 1] - sortedData[base])
        : sortedData[base];
}

function calculateSkewness(data, mean, stdDev) {
    const n = data.length;
    const m3 = data.reduce((acc, val) => acc + Math.pow(val - mean, 3), 0) / n;
    return m3 / Math.pow(stdDev, 3);
}

function calculateKurtosis(data, mean, stdDev) {
    const n = data.length;
    const m4 = data.reduce((acc, val) => acc + Math.pow(val - mean, 4), 0) / n;
    return (m4 / Math.pow(stdDev, 4)) - 3;
}

/**
 * Open results in Office Dialog
 */
let resultsDialog = null;
let currentResults = null; // Store results globally for view switching

// Theme management
function setResultsTheme(theme) {
    localStorage.setItem('resultsTheme', theme);
    
    // Update UI
    document.getElementById('themeLight').classList.toggle('active', theme === 'light');
    document.getElementById('themeDark').classList.toggle('active', theme === 'dark');
}

// Initialize theme on load
Office.onReady(() => {
    const savedTheme = localStorage.getItem('resultsTheme') || 'light';
    setResultsTheme(savedTheme);
});

function openNewView(dialogUrl, results) {
    console.log('🔵 openNewView called');
    console.log('📂 Dialog URL:', dialogUrl);
    console.log('📊 Results available:', !!results);
    console.log('📊 Results data:', results);
    
    Office.context.ui.displayDialogAsync(
        dialogUrl,
        { height: 90, width: 95, displayInIframe: false },
        (asyncResult) => {
            console.log('📬 displayDialogAsync callback triggered');
            console.log('Status:', asyncResult.status);
            
            if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                const error = asyncResult.error;
                console.error('❌ Failed to open view');
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                showStatus('error', 'Failed to open view: ' + error.message);
            } else {
                resultsDialog = asyncResult.value;
                console.log('✅ New view opened:', dialogUrl);
                console.log('Dialog object:', resultsDialog);
                
                // Send data after a short delay
                setTimeout(() => {
                    if (resultsDialog) {
                        const viewData = {
                            values: results.rawData,
                            column: results.column,
                            descriptive: results.descriptive,
                            n: results.n
                        };
                        
                        console.log('📤 Sending data to new view:', viewData);
                        resultsDialog.messageChild(JSON.stringify({
                            action: 'loadData',
                            data: viewData
                        }));
                    } else {
                        console.warn('⚠️ resultsDialog is null, cannot send data');
                    }
                }, 1000);
                
                // Add message handlers
                resultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
                    try {
                        const message = JSON.parse(arg.message);
                        console.log('📩 Message from new view:', message);
                        
                        if (message.status === 'ready') {
                            const viewData = {
                                values: results.rawData,
                                column: results.column,
                                descriptive: results.descriptive,
                                n: results.n
                            };
                            resultsDialog.messageChild(JSON.stringify({
                                action: 'loadData',
                                data: viewData
                            }));
                        } else if (message.action === 'switchView') {
                            console.log('🔄 Switch view in second handler');
                            if (resultsDialog) {
                                console.log('🔴 Closing dialog (handler 2)');
                                resultsDialog.close();
                                resultsDialog = null;
                    unlockTaskpaneUI();
                            }
                            setTimeout(() => {
                                const newDialogUrl = `${window.location.origin}/dialogs/views/${message.view}`;
                                console.log('🟢 Opening new view (handler 2):', newDialogUrl);
                                openNewView(newDialogUrl, currentResults);
                            }, 300);
                        } else if (message.action === 'close' || message.action === 'closeDialog') {
                            resultsDialog.close();
                            resultsDialog = null;
                    unlockTaskpaneUI();
                        }
                    } catch (e) {
                        console.error('Error handling dialog message:', e);
                    }
                });
                
                resultsDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
                    console.log('Dialog event:', arg.error);
                    resultsDialog = null;
                    unlockTaskpaneUI();
                });
            }
        }
    );
}

/**
 * Lock taskpane UI when dialog is open
 */
function lockTaskpaneUI() {
    // Disable all input controls
    const inputs = document.querySelectorAll('input, select, button');
    inputs.forEach(el => {
        el.disabled = true;
        el.dataset.wasDisabled = el.disabled;
    });
    
    // Show notice
    let notice = document.getElementById('dialog-open-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.id = 'dialog-open-notice';
        notice.style.cssText = `
            background: linear-gradient(135deg, rgba(255, 165, 120, 0.15), rgba(255, 165, 120, 0.25));
            border: 2px solid var(--accent-1);
            border-radius: 8px;
            padding: 12px 16px;
            margin: 12px;
            text-align: center;
            font-size: 12px;
            color: var(--text-primary);
            box-shadow: 0 4px 12px rgba(255, 165, 120, 0.3);
            animation: slideDown 0.3s ease;
        `;
        notice.innerHTML = `
            <i class="fa-solid fa-lock" style="color: var(--accent-1); margin-right: 8px;"></i>
            <strong>Analysis in Progress</strong><br>
            <span style="font-size: 11px; opacity: 0.9;">Close the analysis window to modify settings</span>
        `;
        
        const container = document.querySelector('.univariate-container');
        if (container) {
            container.insertBefore(notice, container.firstChild);
        }
    }
    notice.style.display = 'block';
    console.log('🔒 Taskpane UI locked');
}

/**
 * Unlock taskpane UI when dialog closes
 */
function unlockTaskpaneUI() {
    // Re-enable all controls
    const inputs = document.querySelectorAll('input, select, button');
    inputs.forEach(el => {
        el.disabled = false;
    });
    
    // Hide notice
    const notice = document.getElementById('dialog-open-notice');
    if (notice) {
        notice.style.display = 'none';
    }
    console.log('🔓 Taskpane UI unlocked');
}

function openResultsDialog(results) {
    // Store results globally and in localStorage
    currentResults = results;
    
    // Clear old localStorage first, then set new
    localStorage.removeItem('univariateResults');
    console.log('🧹 Cleared localStorage before storing new results');
    console.log('📊 Storing results for column:', results.column, 'n:', results.n);
    localStorage.setItem('univariateResults', JSON.stringify(results));
    
    // Lock taskpane UI
    lockTaskpaneUI();
    
    // Use standalone histogram instead of full results dialog
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/histogram-standalone.html`;
    
    Office.context.ui.displayDialogAsync(
        dialogUrl,
        { height: 90, width: 95, displayInIframe: false },
        (asyncResult) => {
            if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                showStatus('error', 'Failed to open histogram: ' + asyncResult.error.message);
            } else {
                resultsDialog = asyncResult.value;
                console.log('✅ Standalone histogram opened successfully');
                
                // Send data to standalone histogram
                setTimeout(() => {
                    if (resultsDialog) {
                        const histogramData = {
                            values: results.rawData,
                            column: results.column,
                            descriptive: results.descriptive,
                            n: results.n
                        };
                        
                        console.log('📤 Sending data to histogram:', histogramData);
                        resultsDialog.messageChild(JSON.stringify({
                            action: 'loadData',
                            data: histogramData
                        }));
                    }
                }, 1000);
                
                // Add message handler for dialog close requests
                resultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
                    try {
                        const message = JSON.parse(arg.message);
                        console.log('📩 Message from dialog:', message);
                        
                        if (message.status === 'ready') {
                            // Dialog is ready, send data
                            const viewData = {
                                values: results.rawData,
                                column: results.column,
                                descriptive: results.descriptive,
                                n: results.n
                            };
                            resultsDialog.messageChild(JSON.stringify({
                                action: 'loadData',
                                data: viewData
                            }));
                        } else if (message.action === 'switchView') {
                            // User wants to switch to a different view
                            console.log('🔄 Switching to view:', message.view);
                            
                            // Close current dialog
                            if (resultsDialog) {
                                console.log('🔴 Closing current dialog...');
                                resultsDialog.close();
                                resultsDialog = null;
                    unlockTaskpaneUI();
                                console.log('✅ Dialog closed');
                            }
                            
                            // Wait a bit before opening new dialog
                            setTimeout(() => {
                                const newDialogUrl = `${window.location.origin}/dialogs/views/${message.view}`;
                                console.log('🟢 Opening new view:', newDialogUrl);
                                console.log('📊 Current results available:', !!currentResults);
                                openNewView(newDialogUrl, currentResults);
                            }, 300);
                        } else if (message.action === 'close' || message.action === 'closeDialog') {
                            console.log('📤 Close dialog message received');
                            resultsDialog.close();
                            resultsDialog = null;
                    unlockTaskpaneUI();
                        }
                    } catch (e) {
                        console.error('Error handling dialog message:', e);
                    }
                });
                
                // Handle dialog closing event
                resultsDialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
                    console.log('Dialog event:', arg.error);
                    resultsDialog = null;
                    unlockTaskpaneUI();
                });
            }
        }
    );
}

/**
 * Show status message
 */
function showStatus(type, message) {
    const statusMsg = document.getElementById('statusMessage');
    if (statusMsg) {
        statusMsg.textContent = message;
        statusMsg.className = `status-msg ${type} show`;
        
        setTimeout(() => {
            statusMsg.classList.remove('show');
        }, 5000);
    }
}

function showError(message) {
    showStatus('error', message);
}

// Quick test functions for development
function quickTestHistogram() {
    console.log('🧪 Quick test: Histogram');
    
    // Generate sample data
    const sampleData = [];
    for (let i = 0; i < 369; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(201.17 + z * 60.64);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    openResultsDialog(results);
    showStatus('success', 'Test histogram opened!');
}

function quickTestBoxPlot() {
    console.log('🧪 Quick test: Box Plot');
    
    // Generate sample data
    const sampleData = [];
    for (let i = 0; i < 369; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(201.17 + z * 60.64);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/boxplot-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test box plot opened!');
}

/**
 * Quick test function for QQ/PP Plot with sample data
 */
function quickTestQQPlot() {
    console.log('🧪 Quick test: QQ/PP Plot');
    
    // Generate sample data (normal distribution)
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/qqplot-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test QQ/PP plot opened!');
}

/**
 * Quick test function for Kernel Density with sample data
 */
function quickTestKernel() {
    console.log('🧪 Quick test: Kernel Density');
    
    // Generate sample data (normal distribution)
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/kernel-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test Kernel Density opened!');
}

/**
 * Quick test function for Outliers Detection with sample data
 */
function quickTestOutliers() {
    console.log('🧪 Quick test: Outliers Detection');
    
    // Generate sample data with some outliers
    const sampleData = [];
    for (let i = 0; i < 95; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    // Add deliberate outliers
    sampleData.push(5, 95, 100, 3, 92);
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/outliers-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test Outliers Detection opened!');
}

/**
 * Quick test function for Confidence Intervals with sample data
 */
function quickTestConfidence() {
    console.log('🧪 Quick test: Confidence Intervals');
    
    // Generate sample data (normal distribution)
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/confidence-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test Confidence Intervals opened!');
}

/**
 * Quick test function for Normality Tests with sample data
 */
function quickTestNormality() {
    console.log('🧪 Quick test: Normality Tests');
    
    // Generate sample data (normal distribution)
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/normality-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test Normality Tests opened!');
}

/**
 * Quick test function for Hypothesis Testing with sample data
 */
function quickTestHypothesis() {
    console.log('🧪 Quick test: Hypothesis Testing');
    
    // Generate sample data (normal distribution)
    const sampleData = [];
    for (let i = 0; i < 100; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sampleData.push(50 + z * 10);
    }
    
    const results = calculateStatistics(sampleData, 'Test Data', 'none');
    currentResults = results;
    
    const dialogUrl = `${window.location.origin}/dialogs/views/univariate/hypothesis-standalone.html`;
    openNewView(dialogUrl, results);
    showStatus('success', 'Test Hypothesis Testing opened!');
}

/*
  ================================================================
  REGRESSION INPUT PANEL LOGIC (TASKPANE)
  ================================================================
  Uses shared DataInputPanel for range selection.
  Opens a full-screen model builder dialog for assignment.
  ================================================================
*/

/* global Office */

let regressionRangeData = null;
let regressionRangeAddress = '';
let resultsDialog = null;

function onRangeDataLoaded(values, address) {
  console.log('Regression: Range data received', values.length, 'rows');

  if (!values || values.length < 2) {
    showPanel(false);
    return;
  }

  regressionRangeData = values;
  regressionRangeAddress = address || '';

  const headers = values[0] || [];
  const dataRows = values.slice(1);

  updateSummary(regressionRangeAddress, dataRows.length, headers.length);
  updateButtonState(); // Update button text based on saved model
  showPanel(true);
}

function showPanel(show) {
  const panel = document.getElementById('regressionPanel');
  if (panel) panel.style.display = show ? 'block' : 'none';
  const btn = document.getElementById('openModelBuilder');
  if (btn) btn.disabled = !show;
}

function updateSummary(address, rows, cols) {
  const rangeEl = document.getElementById('regRange');
  const rowsEl = document.getElementById('regRows');
  const colsEl = document.getElementById('regCols');
  if (rangeEl) rangeEl.textContent = address || 'Selection';
  if (rowsEl) rowsEl.textContent = rows || 0;
  if (colsEl) colsEl.textContent = cols || 0;
}

function openModelBuilder() {
  console.log('🪟 Open Model Builder clicked');
  if (!regressionRangeData || regressionRangeData.length < 2) {
    console.warn('No range data available for model builder');
    return;
  }

  const dialogUrl = `${getDialogsBaseUrl()}regression/regression-input.html`;

  if (!Office || !Office.context || !Office.context.ui) {
    console.error('Office dialog API not available');
    alert('Dialog API not available. Please reopen the add-in.');
    return;
  }

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 30, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open dialog:', asyncResult.error);
        alert(`Failed to open dialog: ${asyncResult.error.message || asyncResult.error}`);
      } else {
        resultsDialog = asyncResult.value;
        console.log('✅ Regression dialog opened');

        setTimeout(() => {
          sendDialogData();
        }, 600);

        resultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);

            if (message.action === 'ready' || message.action === 'requestData') {
              sendDialogData();
            } else if (message.action === 'regressionModel') {
              const modelSpec = message.payload || message.data || {};
              console.log('📊 Received model spec:', modelSpec);
              sessionStorage.setItem('regressionModelSpec', JSON.stringify(modelSpec));
              // Close the model builder dialog
              resultsDialog.close();
              resultsDialog = null;
              // Wait for dialog to fully close before opening the next one
              // Office.js doesn't allow multiple dialogs open simultaneously
              setTimeout(() => {
                openRegressionCoefficientsDialog();
              }, 500);
            } else if (message.action === 'close') {
              resultsDialog.close();
              resultsDialog = null;
            }
          } catch (e) {
            console.error('Error handling dialog message:', e);
          }
        });

        resultsDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          resultsDialog = null;
        });
      }
    }
  );
}

function openRegressionCoefficientsDialog() {
  console.log('🪟 Opening Regression Coefficients dialog');
  
  const dialogUrl = `${getDialogsBaseUrl()}regression/regression-coefficients.html`;

  if (!Office || !Office.context || !Office.context.ui) {
    console.error('Office dialog API not available');
    alert('Dialog API not available. Please reopen the add-in.');
    return;
  }

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open coefficients dialog:', asyncResult.error);
        alert(`Failed to open dialog: ${asyncResult.error.message || asyncResult.error}`);
      } else {
        resultsDialog = asyncResult.value;
        console.log('✅ Regression coefficients dialog opened');

        resultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);

            if (message.action === 'ready' || message.action === 'requestData') {
              console.log('📨 Dialog is ready, sending regression results');
              sendRegressionResults();
            } else if (message.action === 'SAVE_ANALYSIS') {
              // Handle save analysis request from dialog
              console.log('💾 Received SAVE_ANALYSIS request from dialog');
              handleSaveAnalysisFromDialog(message.data);
            } else if (message.action === 'LOAD_ANALYSIS') {
              // Handle load analysis request from dialog
              console.log('📂 Received LOAD_ANALYSIS request from dialog');
              handleLoadAnalysisFromDialog(message.data);
            } else if (message.action === 'DELETE_ANALYSIS') {
              // Handle delete analysis request from dialog
              console.log('🗑️ Received DELETE_ANALYSIS request from dialog');
              handleDeleteAnalysisFromDialog(message.data);
            } else if (message.action === 'close') {
              resultsDialog.close();
              resultsDialog = null;
              // Update taskpane button state after closing dialog
              updateButtonState();
            }
          } catch (e) {
            console.error('Error handling dialog message:', e);
          }
        });

        resultsDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          console.log('📊 Coefficients dialog closed by user');
          resultsDialog = null;
          // Update taskpane button state after closing dialog
          updateButtonState();
        });
        
        // Also send data after a delay as fallback
        setTimeout(() => {
          console.log('⏰ Timeout reached, sending data as fallback');
          sendRegressionResults();
        }, 1200);
      }
    }
  );
}

// Temporary launcher to preview the logistic dashboard template using current data context.
// This does not run logistic estimation yet; it sends a lightweight bundle so UI wiring can be validated.
function openLogisticResultsDialog() {
  console.log('🪟 Opening Logistic Results dialog');

  const dialogUrl = `${getDialogsBaseUrl()}logistic/logistic-results.html`;

  if (!Office || !Office.context || !Office.context.ui) {
    console.error('Office dialog API not available');
    alert('Dialog API not available. Please reopen the add-in.');
    return;
  }

  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 90, width: 70, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open logistic dialog:', asyncResult.error);
        alert(`Failed to open dialog: ${asyncResult.error.message || asyncResult.error}`);
      } else {
        resultsDialog = asyncResult.value;
        console.log('✅ Logistic results dialog opened');

        resultsDialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
          try {
            const message = JSON.parse(arg.message);
            if (message.action === 'ready') {
              // Placeholder payload for UI smoke-testing.
              resultsDialog.messageChild(JSON.stringify({
                type: 'LOGISTIC_BUNDLE',
                payload: {
                  results: {
                    observations: regressionRangeData ? Math.max((regressionRangeData.length - 1), 0) : 0,
                    link: 'Logit'
                  }
                }
              }));
            } else if (message.action === 'close') {
              resultsDialog.close();
              resultsDialog = null;
            }
          } catch (e) {
            console.error('Error handling logistic dialog message:', e);
          }
        });

        resultsDialog.addEventHandler(Office.EventType.DialogEventReceived, () => {
          console.log('📊 Logistic dialog closed by user');
          resultsDialog = null;
        });
      }
    }
  );
}

window.openLogisticResultsDialog = openLogisticResultsDialog;

function sendDialogData() {
  if (!resultsDialog || !regressionRangeData) return;

  const headers = regressionRangeData[0] || [];
  const rows = regressionRangeData.slice(1);
  
  // Include saved model spec if it exists (for reopening with previous configuration)
  const savedModelSpec = sessionStorage.getItem('regressionModelSpec');
  const modelSpec = savedModelSpec ? JSON.parse(savedModelSpec) : null;

  resultsDialog.messageChild(JSON.stringify({
    type: 'REGRESSION_DATA',
    payload: {
      headers,
      rows,
      address: regressionRangeAddress,
      savedModelSpec: modelSpec  // Include the saved model configuration
    }
  }));
}

function sendRegressionResults() {
  if (!resultsDialog) {
    console.warn('⚠️ No dialog available to send results to');
    return;
  }
  
  if (!regressionRangeData) {
    console.warn('⚠️ No regression data available to send');
    return;
  }

  const headers = regressionRangeData[0] || [];
  const rows = regressionRangeData.slice(1);
  const modelSpec = JSON.parse(sessionStorage.getItem('regressionModelSpec') || '{}');

  console.log('📤 Sending regression results to dialog:', {
    headers: headers.length,
    rows: rows.length,
    modelSpec
  });

  resultsDialog.messageChild(JSON.stringify({
    type: 'REGRESSION_RESULTS',
    payload: {
      headers,
      rows,
      address: regressionRangeAddress,
      modelSpec
    }
  }));
  
  console.log('✅ Sent regression results to coefficients dialog');
}

function getDialogsBaseUrl() {
  const href = window.location.href;
  if (href.includes('/taskpane/')) {
    return `${href.split('/taskpane/')[0]}/dialogs/views/`;
  }
  return `${window.location.origin}/dialogs/views/`;
}

// ============================================================================
// SAVED ANALYSES HANDLERS (from dialog message passing)
// ============================================================================

/**
 * Handle save analysis request from dialog
 * The dialog can't access settings API, so we do it here in the taskpane
 */
async function handleSaveAnalysisFromDialog(analysisData) {
  try {
    console.log('💾 Taskpane: Saving analysis received from dialog:', analysisData.name);
    
    // Use SavedAnalysesManager which will work in taskpane context
    if (typeof SavedAnalysesManager !== 'undefined') {
      await SavedAnalysesManager.saveAnalysis(analysisData);
      console.log('✅ Analysis saved successfully from taskpane');
    } else {
      console.error('❌ SavedAnalysesManager not available');
    }
  } catch (error) {
    console.error('❌ Error saving analysis in taskpane:', error);
  }
}

/**
 * Handle load analysis request from dialog
 */
async function handleLoadAnalysisFromDialog(analysisId) {
  try {
    console.log('📂 Taskpane: Loading analysis:', analysisId);
    
    if (typeof SavedAnalysesManager !== 'undefined') {
      const analysis = await SavedAnalysesManager.loadAnalysisById(analysisId);
      console.log('✅ Analysis loaded:', analysis);
      // Could send back to dialog if needed
    }
  } catch (error) {
    console.error('❌ Error loading analysis in taskpane:', error);
  }
}

/**
 * Handle delete analysis request from dialog
 */
async function handleDeleteAnalysisFromDialog(analysisId) {
  try {
    console.log('🗑️ Taskpane: Deleting analysis:', analysisId);
    
    if (typeof SavedAnalysesManager !== 'undefined') {
      await SavedAnalysesManager.deleteAnalysis(analysisId);
      console.log('✅ Analysis deleted successfully');
    }
  } catch (error) {
    console.error('❌ Error deleting analysis in taskpane:', error);
  }
}

function updateButtonState() {
  const savedModelSpec = sessionStorage.getItem('regressionModelSpec');
  const hasSavedModel = savedModelSpec && savedModelSpec !== '{}';
  
  const mainBtn = document.getElementById('openModelBuilder');
  const resetBtn = document.getElementById('resetModelBtn');
  const note = document.getElementById('regressionNote');
  
  if (hasSavedModel) {
    // Show "Run Last Model" button
    if (mainBtn) {
      mainBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Last Model';
    }
    if (resetBtn) {
      resetBtn.style.display = 'block';
    }
    if (note) {
      try {
        const modelSpec = JSON.parse(savedModelSpec);
        const yVar = modelSpec.y || 'Y';
        const xCount = (modelSpec.xn?.length || 0) + (modelSpec.xc?.length || 0);
        note.textContent = `Last model: ${yVar} ~ ${xCount} predictor${xCount !== 1 ? 's' : ''}. Click to view/modify or reset to start fresh.`;
        note.style.background = '#f0fdf4';
        note.style.borderColor = '#86efac';
        note.style.color = '#166534';
      } catch (e) {
        note.textContent = 'A previous model configuration is saved. Click to run it again or reset to start fresh.';
      }
    }
  } else {
    // Show "Open Model Builder" button
    if (mainBtn) {
      mainBtn.innerHTML = '<i class="fa-solid fa-up-right-from-square"></i> Open Model Builder';
    }
    if (resetBtn) {
      resetBtn.style.display = 'none';
    }
    if (note) {
      note.textContent = 'Select data above, then build your ANCOVA model in the popup (supports categorical predictors).';
      note.style.background = '#eff6ff';
      note.style.borderColor = '#bfdbfe';
      note.style.color = '#1e40af';
    }
  }
  
  console.log('🔄 Button state updated. Has saved model:', hasSavedModel);
}

function resetModel() {
  console.log('🔄 Resetting model configuration');
  sessionStorage.removeItem('regressionModelSpec');
  updateButtonState();
  
  // Show a brief confirmation
  const note = document.getElementById('regressionNote');
  if (note) {
    const originalText = note.textContent;
    const originalBg = note.style.background;
    const originalBorder = note.style.borderColor;
    const originalColor = note.style.color;
    
    note.textContent = '✓ Model configuration cleared. Ready to build a new model!';
    note.style.background = '#f0fdf4';
    note.style.borderColor = '#86efac';
    note.style.color = '#166534';
    
    setTimeout(() => {
      note.textContent = originalText;
      note.style.background = originalBg;
      note.style.borderColor = originalBorder;
      note.style.color = originalColor;
    }, 2000);
  }
}

function hookUI() {
  const btn = document.getElementById('openModelBuilder');
  if (btn) {
    btn.addEventListener('click', openModelBuilder);
  }
}

Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    hookUI();
  }
});

window.openModelBuilder = openModelBuilder;

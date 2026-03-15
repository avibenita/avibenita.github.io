/*
  ================================================================
  CORRELATION INPUT PANEL LOGIC (TASKPANE)
  ================================================================
  Handles data loading and opens configuration dialog
  ================================================================
*/

/* global Office */

// Store current range data
let correlationRangeData = null;
let correlationDialog = null;
let currentResultDialog = null; // Track the current result dialog (matrix, network, etc.)

/**
 * Called when range data is loaded from DataInputPanel
 * This function is automatically triggered by the shared component
 */
function onRangeDataLoaded(values, address) {
  console.log('Correlation: Range data received', values.length, 'rows');
  
  if (!values || values.length < 2) {
    showError('Please select a range with at least a header row and one data row');
    return;
  }
  
  // Store data for the dialog
  correlationRangeData = { values, address };
  
  // Store in sessionStorage for dialog to pick up
  sessionStorage.setItem('correlationRawData', JSON.stringify({ values, address }));
  
  // Update UI
  const headers = values[0];
  const dataRows = values.slice(1);
  
  document.getElementById('corrRange').textContent = address;
  document.getElementById('corrRows').textContent = dataRows.length;
  document.getElementById('corrCols').textContent = headers.length;
  
  // Enable button
  const btn = document.getElementById('openCorrelationConfig');
  if (btn) {
    btn.disabled = false;
  }
}

/**
 * Show correlation panel
 */
function showCorrelationPanel() {
  // Panel is always visible, just for compatibility
}

/**
 * Hide correlation panel
 */
function hideCorrelationPanel() {
  // Panel is always visible, just for compatibility
}

/**
 * Show error message
 */
function showError(message) {
  console.error(message);
  // Could add visual error display here
}

/**
 * Get dialogs base URL (local or production)
 */
function getDialogsBaseUrl() {
  const currentUrl = window.location.href;
  if (currentUrl.includes('127.0.0.1') || currentUrl.includes('localhost')) {
    return 'http://127.0.0.1:8080/dialogs/views/';
  }
  // Extract base URL dynamically for production
  if (currentUrl.includes('/taskpane/')) {
    return `${currentUrl.split('/taskpane/')[0]}/dialogs/views/`;
  }
  return `${window.location.origin}/dialogs/views/`;
}

/**
 * Open correlation configuration dialog
 */
function openCorrelationConfig() {
  if (!correlationRangeData) {
    alert('No data loaded. Please select a range first.');
    return;
  }
  
  const dialogUrl = `${getDialogsBaseUrl()}correlations/correlation-config.html`;
  
  console.log('Opening correlation config dialog:', dialogUrl);
  
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 88, width: 72, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        console.error('Failed to open dialog:', asyncResult.error);
        alert('Failed to open Configuration: ' + asyncResult.error.message);
      } else {
        correlationDialog = asyncResult.value;
        console.log('✅ Correlation configuration dialog opened successfully');
        
        // Handle messages from dialog
        correlationDialog.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (arg) => {
            console.log('🔔 RAW message received from dialog:', arg);
            try {
              const message = JSON.parse(arg.message);
              console.log('🔔 PARSED message from correlation dialog:', message);
              console.log('🔔 Message action:', message.action);
              
              if (message.action === 'ready') {
                console.log('✅ Dialog ready, sending data...');
                // Dialog is ready, send data
                correlationDialog.messageChild(JSON.stringify({
                  type: 'CORRELATION_DATA',
                  payload: correlationRangeData
                }));
              } else if (message.action === 'runAnalysis') {
                console.log('🎯 runAnalysis message received!');
                // Dialog wants to run analysis
                handleRunAnalysis(message.data);
              } else if (message.action === 'switchView') {
                console.log('🔀 switchView message received:', message.view);
                // Close current dialog and open new view
                handleSwitchView(message.view);
              } else {
                console.warn('⚠️ Unknown action:', message.action);
              }
            } catch (e) {
              console.error('❌ Error parsing dialog message:', e, 'Raw:', arg);
            }
          }
        );
        
        // Handle dialog closed
        correlationDialog.addEventHandler(
          Office.EventType.DialogEventReceived,
          (arg) => {
            console.log('Dialog event:', arg);
            correlationDialog = null;
          }
        );
      }
    }
  );
}

/**
 * Handle run analysis request from dialog
 */
function handleRunAnalysis(data) {
  console.log('🔥 handleRunAnalysis called with:', data);
  
  // Close the config dialog first
  if (correlationDialog) {
    console.log('🔒 Closing config dialog...');
    correlationDialog.close();
    correlationDialog = null;
  }
  
  // Extract data - it comes as { variables, method, viewType, data }
  // where data is { values, address }
  const dataValues = data.data?.values || correlationRangeData?.values || [];
  
  console.log('📊 dataValues length:', dataValues.length);
  console.log('📊 correlationRangeData:', correlationRangeData);
  
  if (!dataValues || dataValues.length < 2) {
    console.error('❌ Invalid data structure');
    return;
  }
  
  const headers = dataValues[0];
  const rows = dataValues.slice(1);
  
  console.log('📊 headers:', headers);
  console.log('📊 rows count:', rows.length);
  
  // Convert rows to objects with header keys for correlation calculation
  const dataObjects = rows.map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx];
    });
    return obj;
  });
  
  // Filter selected variables
  const selectedVars = data.variables || headers;
  
  console.log('📊 selectedVars:', selectedVars);
  console.log('📊 dataObjects count:', dataObjects.length);
  
  // Prepare data for matrix dialog
  const matrixData = {
    data: dataObjects,
    headers: selectedVars,
    selectedVariables: selectedVars,
    method: data.method || 'pearson',
    address: data.data?.address || correlationRangeData?.address
  };
  
  console.log('📊 Prepared matrix data with', matrixData.headers.length, 'variables');
  
  // Store for matrix dialog
  sessionStorage.setItem('correlationMatrixData', JSON.stringify(matrixData));
  
  // Wait a moment for the config dialog to fully close before opening matrix
  console.log('⏳ Waiting for dialog to close...');
  setTimeout(() => {
    console.log('🚀 Opening matrix dialog...');
    openCorrelationResultDialog('matrix', matrixData);
  }, 300);
}

/**
 * Open correlation result dialog
 */
function openCorrelationResultDialog(viewType, matrixData) {
  const dialogFile = 'correlation-matrix.html';
  const dialogUrl = `${getDialogsBaseUrl()}correlations/${dialogFile}`;
  
  console.log('📂 Opening matrix dialog:', dialogUrl);
  
  Office.context.ui.displayDialogAsync(
    dialogUrl,
    { height: 95, width: 95, displayInIframe: false },
    (asyncResult) => {
      if (asyncResult.status === Office.AsyncResultStatus.Failed) {
        const error = asyncResult.error;
        console.error('❌ Failed to open matrix dialog:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error name:', error.name);
      } else {
        currentResultDialog = asyncResult.value; // Store global reference
        console.log('✅ Matrix dialog opened successfully');
        
        // Send data to matrix dialog
        currentResultDialog.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (arg) => {
            try {
              const message = JSON.parse(arg.message);
              console.log('📨 Message from matrix dialog:', message);
              
              if (message.action === 'ready') {
                console.log('📤 Sending data to matrix dialog:', matrixData);
                currentResultDialog.messageChild(JSON.stringify({
                  type: 'CORRELATION_DATA',
                  payload: {
                    data: matrixData.data,
                    headers: matrixData.headers,
                    selectedVariables: matrixData.selectedVariables,
                    method: matrixData.method
                  }
                }));
              } else if (message.action === 'switchView') {
                console.log('🔀 Matrix dialog requests view switch:', message.view);
                handleSwitchView(message.view);
              }
            } catch (e) {
              console.error('❌ Error in matrix dialog communication:', e);
            }
          }
        );
      }
    }
  );
}

/**
 * Handle switching between correlation views (matrix, network, taylor, etc.)
 */
function handleSwitchView(viewFilename) {
  console.log('🔀 Switching to view:', viewFilename);
  
  // Close current result dialog if open
  if (currentResultDialog) {
    console.log('🔒 Closing current dialog...');
    currentResultDialog.close();
    currentResultDialog = null;
  }
  
  // Get stored matrix data from session
  const storedData = sessionStorage.getItem('correlationMatrixData');
  if (!storedData) {
    console.error('❌ No correlation data found in session');
    return;
  }
  
  const matrixData = JSON.parse(storedData);
  const dialogUrl = `${getDialogsBaseUrl()}${viewFilename}`;
  
  console.log('📂 Opening new view:', dialogUrl);
  
  // Wait for current dialog to close, then open new one
  setTimeout(() => {
    Office.context.ui.displayDialogAsync(
      dialogUrl,
      { height: 95, width: 95, displayInIframe: false },
      (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          const error = asyncResult.error;
          console.error('❌ Failed to open new view:', error);
        } else {
          currentResultDialog = asyncResult.value;
          console.log('✅ New view opened successfully');
          
          // Send data to new view
          currentResultDialog.addEventHandler(
            Office.EventType.DialogMessageReceived,
            (arg) => {
              try {
                const message = JSON.parse(arg.message);
                
                if (message.action === 'ready') {
                  console.log('📤 Sending data to new view');
                  currentResultDialog.messageChild(JSON.stringify({
                    type: 'CORRELATION_DATA',
                    payload: matrixData
                  }));
                } else if (message.action === 'switchView') {
                  handleSwitchView(message.view);
                }
              } catch (e) {
                console.error('❌ Error in new view communication:', e);
              }
            }
          );
        }
      }
    );
  }, 300);
}

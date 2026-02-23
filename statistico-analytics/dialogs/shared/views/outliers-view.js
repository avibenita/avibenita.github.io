/**
 * Outliers Detection View - Shared Analysis Component
 * 
 * Can be used by: Univariate, Regression (residuals), any module needing outlier detection
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n }
 * - Highcharts library must be loaded
 * - jStat library must be loaded
 * 
 * Exports:
 * - displayOutliersView() - Main display function
 * - Multiple outlier detection methods (Grubbs, IQR, Z-score, MAD)
 */

let currentOutlierMethod = 'iqr';
let outlierResults = null;
let chartOrderBy = 'index'; // 'index' or 'value'

/**
 * Convert row index to Excel address (e.g., 0 -> A2, assuming row 1 is header)
 */
function getExcelAddress(rowIndex, columnName) {
  const rowNumber = rowIndex + 2; // +2 because row 1 is header and Excel is 1-indexed
  return `${columnName}${rowNumber}`;
}

/**
 * Display outliers detection view
 */
function displayOutliersView() {
  const { column, n } = resultsData;
  
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  document.getElementById('resultsContent').innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <div class="outliers-container">
      <!-- Method Selection -->
      <div class="outliers-panel">
        <div class="panel-heading">
          <div>
            <i class="fa-solid fa-filter"></i>
            Detection Method
          </div>
        </div>
        <div class="panel-body">
          <div class="method-grid">
            <button class="outlier-method-btn active" onclick="selectOutlierMethod('iqr')" id="method-iqr">
              <i class="fa-solid fa-chart-box"></i>
              <span>IQR Method</span>
              <small>1.5 × IQR</small>
            </button>
            <button class="outlier-method-btn" onclick="selectOutlierMethod('zscore')" id="method-zscore">
              <i class="fa-solid fa-chart-line"></i>
              <span>Z-Score</span>
              <small>|z| > 3</small>
            </button>
            <button class="outlier-method-btn" onclick="selectOutlierMethod('grubbs')" id="method-grubbs">
              <i class="fa-solid fa-flask"></i>
              <span>Grubbs Test</span>
              <small>Statistical</small>
            </button>
            <button class="outlier-method-btn" onclick="selectOutlierMethod('mad')" id="method-mad">
              <i class="fa-solid fa-chart-scatter"></i>
              <span>MAD</span>
              <small>Robust</small>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Results Display - Summary and Comparison Table -->
      <div class="outliers-panel results-panel">
        <div class="panel-heading">
          <div>
            <i class="fa-solid fa-exclamation-triangle"></i>
            Detection Results
          </div>
        </div>
        <div class="panel-body">
          <div id="outliersResults"></div>
        </div>
      </div>
      
      <!-- Table and Chart Grid -->
      <div class="outliers-results-grid">
        <!-- Detected Outliers Table -->
        <div class="outliers-panel">
          <div class="panel-heading">
            <div>
              <i class="fa-solid fa-table"></i>
              Detected Outliers
            </div>
          </div>
          <div class="panel-body">
            <div id="outliersTable"></div>
          </div>
        </div>
        
        <!-- Chart -->
        <div class="outliers-panel">
          <div class="panel-heading">
            <div>
              <i class="fa-solid fa-chart-simple"></i>
              Visualization
            </div>
            <div class="order-toggle">
              <button class="order-btn ${chartOrderBy === 'index' ? 'active' : ''}" onclick="toggleChartOrder('index')">Order by Index</button>
              <button class="order-btn ${chartOrderBy === 'value' ? 'active' : ''}" onclick="toggleChartOrder('value')">Order by Value</button>
            </div>
          </div>
          <div class="panel-body">
            <div id="outliersChart"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    detectOutliers();
  }, 100);
}

/**
 * Select outlier detection method
 */
function selectOutlierMethod(method) {
  currentOutlierMethod = method;
  document.querySelectorAll('.outlier-method-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`method-${method}`).classList.add('active');
  detectOutliers();
}

/**
 * Detect outliers using selected method
 */
function detectOutliers() {
  if (!resultsData || !resultsData.rawData) return;
  
  const data = resultsData.rawData;
  
  switch(currentOutlierMethod) {
    case 'iqr':
      outlierResults = detectOutliersIQR(data);
      break;
    case 'zscore':
      outlierResults = detectOutliersZScore(data);
      break;
    case 'grubbs':
      outlierResults = detectOutliersGrubbs(data);
      break;
    case 'mad':
      outlierResults = detectOutliersMAD(data);
      break;
  }
  
  displayOutliersResults();
  createOutliersChart();
}

/**
 * IQR Method
 */
function detectOutliersIQR(data) {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  const outliers = data.map((val, idx) => ({
    value: val,
    index: idx,
    isOutlier: val < lowerFence || val > upperFence,
    type: val < lowerFence ? 'lower' : (val > upperFence ? 'upper' : null)
  })).filter(item => item.isOutlier);
  
  return {
    method: 'IQR Method (1.5 × IQR)',
    outliers,
    lowerBound: lowerFence,
    upperBound: upperFence,
    stats: { q1, q3, iqr }
  };
}

/**
 * Z-Score Method
 */
function detectOutliersZScore(data) {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  const threshold = 3;
  const lowerBound = mean - threshold * stdDev;
  const upperBound = mean + threshold * stdDev;
  
  const outliers = data.map((val, idx) => {
    const zScore = (val - mean) / stdDev;
    return {
      value: val,
      index: idx,
      zScore,
      isOutlier: Math.abs(zScore) > threshold,
      type: zScore < -threshold ? 'lower' : (zScore > threshold ? 'upper' : null)
    };
  }).filter(item => item.isOutlier);
  
  return {
    method: 'Z-Score Method (|z| > 3)',
    outliers,
    lowerBound,
    upperBound,
    stats: { mean, stdDev, threshold }
  };
}

/**
 * Grubbs Test
 */
function detectOutliersGrubbs(data) {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  
  const deviations = data.map((val, idx) => ({
    value: val,
    index: idx,
    deviation: Math.abs(val - mean)
  }));
  
  const maxDeviation = Math.max(...deviations.map(d => d.deviation));
  const suspectPoint = deviations.find(d => d.deviation === maxDeviation);
  
  const G = maxDeviation / stdDev;
  const alpha = 0.05;
  const df = n - 2;
  const tCrit = jStat.studentt.inv(1 - alpha / (2 * n), df);
  const G_crit = ((n - 1) / Math.sqrt(n)) * Math.sqrt((tCrit ** 2) / (df + tCrit ** 2));
  
  const isOutlier = G > G_crit;
  
  const outliers = isOutlier ? [{
    value: suspectPoint.value,
    index: suspectPoint.index,
    isOutlier: true,
    G,
    G_crit,
    type: suspectPoint.value < mean ? 'lower' : 'upper'
  }] : [];
  
  return {
    method: `Grubbs Test (α=0.05)`,
    outliers,
    lowerBound: mean - 3 * stdDev,
    upperBound: mean + 3 * stdDev,
    stats: { mean, stdDev, G, G_crit, df }
  };
}

/**
 * MAD (Median Absolute Deviation) Method
 */
function detectOutliersMAD(data) {
  const sorted = [...data].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const absDeviations = data.map(val => Math.abs(val - median));
  const mad = [...absDeviations].sort((a, b) => a - b)[Math.floor(absDeviations.length / 2)];
  
  const threshold = 3.5;
  const modifiedZScores = data.map((val, idx) => ({
    value: val,
    index: idx,
    modifiedZ: 0.6745 * (val - median) / mad,
    isOutlier: Math.abs(0.6745 * (val - median) / mad) > threshold
  }));
  
  const outliers = modifiedZScores.filter(item => item.isOutlier).map(item => ({
    ...item,
    type: item.modifiedZ < 0 ? 'lower' : 'upper'
  }));
  
  const lowerBound = median - threshold * mad / 0.6745;
  const upperBound = median + threshold * mad / 0.6745;
  
  return {
    method: 'MAD Method (Modified Z-Score > 3.5)',
    outliers,
    lowerBound,
    upperBound,
    stats: { median, mad, threshold }
  };
}

/**
 * Display outliers results
 */
function displayOutliersResults() {
  const { method, outliers, lowerBound, upperBound, stats } = outlierResults;
  const totalData = resultsData.rawData.length;
  const outlierCount = outliers.length;
  const outlierPercent = ((outlierCount / totalData) * 100).toFixed(2);
  
  // Calculate stats for original and clean data
  const originalData = resultsData.rawData;
  const outlierValues = new Set(outliers.map(o => o.value));
  const cleanData = originalData.filter(val => !outlierValues.has(val));
  
  const calcStats = (data) => {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Quartiles
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.50);
    const q3Index = Math.floor(n * 0.75);
    const q25 = sorted[q1Index];
    const q50 = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[q2Index];
    const q75 = sorted[q3Index];
    const min = sorted[0];
    const max = sorted[n-1];
    
    return { count: n, mean, stdDev, min, q25, q50, q75, max };
  };
  
  const originalStats = calcStats(originalData);
  const cleanStats = outlierCount > 0 ? calcStats(cleanData) : originalStats;
  
  // Get column name for Excel address
  const columnName = resultsData.column || 'A';
  
  // Results panel content - summary and table side by side
  let resultsHTML = `
    <div class="results-horizontal-layout">
      <div class="outliers-summary-compact">
        <div class="summary-card-compact ${outlierCount > 0 ? 'has-outliers' : ''}">
          <div class="summary-label">OUTLIERS DETECTED</div>
          <div class="summary-value-large">${outlierCount} / ${totalData} (${outlierPercent}%)</div>
        </div>
      </div>
      <div class="comparison-table-container">
        <table class="comparison-table">
        <thead>
          <tr>
            <th>Range</th>
            <th>Count</th>
            <th>Average</th>
            <th>Std</th>
            <th>Min</th>
            <th>Q25</th>
            <th>Q50</th>
            <th>Q75</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="range-label">Original data</td>
            <td>${originalStats.count}</td>
            <td>${originalStats.mean.toFixed(0)}</td>
            <td>${originalStats.stdDev.toFixed(0)}</td>
            <td>${originalStats.min}</td>
            <td>${originalStats.q25.toFixed(0)}</td>
            <td>${originalStats.q50.toFixed(0)}</td>
            <td>${originalStats.q75.toFixed(0)}</td>
            <td>${originalStats.max}</td>
          </tr>
          <tr>
            <td class="range-label">WITHOUT outliers</td>
            <td>${cleanStats.count}</td>
            <td>${cleanStats.mean.toFixed(0)}</td>
            <td>${cleanStats.stdDev.toFixed(0)}</td>
            <td>${cleanStats.min}</td>
            <td>${cleanStats.q25.toFixed(0)}</td>
            <td>${cleanStats.q50.toFixed(0)}</td>
            <td>${cleanStats.q75.toFixed(0)}</td>
            <td>${cleanStats.max}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  `;
  
  // Outliers table content (right side)
  let tableHTML = '';
  if (outlierCount > 0) {
    // Table always shows outliers by their original index
    const sortedOutliers = [...outliers].sort((a, b) => a.index - b.index);
    
    tableHTML = `
      <div class="outliers-table-container">
        <table class="outliers-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>Value</th>
              <th>Type</th>
              <th>Excel Address</th>
            </tr>
          </thead>
          <tbody>
            ${sortedOutliers.map((outlier) => `
              <tr>
                <td>${outlier.index}</td>
                <td>${outlier.value.toFixed(4)}</td>
                <td><span class="outlier-badge ${outlier.type}">${outlier.type}</span></td>
                <td class="excel-address">${getExcelAddress(outlier.index, columnName)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    tableHTML = `
      <div class="no-outliers">
        <i class="fa-solid fa-circle-check" style="font-size: 48px; color: var(--accent-2); margin-bottom: 12px;"></i>
        <div>No outliers detected</div>
      </div>
    `;
  }
  
  document.getElementById('outliersResults').innerHTML = resultsHTML;
  document.getElementById('outliersTable').innerHTML = tableHTML;
}

/**
 * Get outlier-specific details
 */
function getOutlierDetails(outlier) {
  if (outlier.zScore !== undefined) {
    return `z = ${outlier.zScore.toFixed(3)}`;
  } else if (outlier.G !== undefined) {
    return `G = ${outlier.G.toFixed(3)}`;
  } else if (outlier.modifiedZ !== undefined) {
    return `Modified Z = ${outlier.modifiedZ.toFixed(3)}`;
  }
  return '-';
}

/**
 * Create outliers visualization chart
 */
function createOutliersChart() {
  const data = resultsData.rawData;
  const { outliers, lowerBound, upperBound } = outlierResults;
  
  const outlierIndices = new Set(outliers.map(o => o.index));
  
  let normalPoints, outlierPoints, xAxisTitle;
  
  if (chartOrderBy === 'index') {
    // Order by original observation index (as they appear in sheet)
    normalPoints = data.map((val, idx) => outlierIndices.has(idx) ? null : [idx, val]).filter(p => p !== null);
    outlierPoints = outliers.map(o => [o.index, o.value]);
    xAxisTitle = 'Observation Index';
  } else {
    // Order by value - sort ALL data from smallest to largest
    const allData = data.map((val, idx) => ({ 
      val, 
      idx, 
      isOutlier: outlierIndices.has(idx) 
    })).sort((a, b) => a.val - b.val);
    
    // Assign positions based on sorted order
    normalPoints = [];
    outlierPoints = [];
    allData.forEach((item, sortedPosition) => {
      if (item.isOutlier) {
        outlierPoints.push([sortedPosition, item.val]);
      } else {
        normalPoints.push([sortedPosition, item.val]);
      }
    });
    xAxisTitle = 'Sorted Position (by value)';
  }
  
  const textColor = document.body.classList.contains('theme-dark') ? '#ffffff' : '#1e293b';
  const gridColor = document.body.classList.contains('theme-dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  Highcharts.chart('outliersChart', {
    chart: {
      type: 'scatter',
      backgroundColor: 'transparent',
      height: 400,
      reflow: true
    },
    title: null,
    xAxis: {
      title: { text: xAxisTitle, style: { color: textColor } },
      labels: { style: { color: textColor } },
      gridLineColor: gridColor
    },
    yAxis: {
      title: { text: 'Value', style: { color: textColor } },
      labels: { style: { color: textColor } },
      gridLineColor: gridColor,
      plotLines: [
        {
          value: lowerBound,
          color: '#e74c3c',
          width: 2,
          dashStyle: 'Dash',
          label: { text: 'Lower Bound', style: { color: '#e74c3c' } }
        },
        {
          value: upperBound,
          color: '#e74c3c',
          width: 2,
          dashStyle: 'Dash',
          label: { text: 'Upper Bound', style: { color: '#e74c3c' } }
        }
      ]
    },
    legend: {
      enabled: true,
      itemStyle: { color: textColor }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: { color: '#ffffff' },
      formatter: function() {
        if (chartOrderBy === 'index') {
          return `Index: <b>${this.x}</b><br/>Value: <b>${this.y.toFixed(4)}</b>`;
        } else {
          const outlier = outliers.find(o => o.value === this.y);
          return `Rank: <b>${this.x + 1}</b><br/>Value: <b>${this.y.toFixed(4)}</b><br/>Original Index: <b>${outlier ? outlier.index : 'N/A'}</b>`;
        }
      }
    },
    plotOptions: {
      scatter: {
        marker: { radius: 5 }
      }
    },
    series: [
      {
        name: 'Normal Points',
        data: normalPoints,
        color: '#3b82f6',
        marker: { radius: 4 }
      },
      {
        name: 'Outliers',
        data: outlierPoints,
        color: '#e74c3c',
        marker: { radius: 6, symbol: 'diamond' }
      }
    ]
  });
}

/**
 * Toggle chart ordering (applies to chart only, not table)
 */
function toggleChartOrder(orderBy) {
  chartOrderBy = orderBy;
  document.querySelectorAll('.order-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  createOutliersChart();
}

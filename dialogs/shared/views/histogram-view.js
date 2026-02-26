/**
 * Histogram View - Shared Analysis Component
 * 
 * Can be used by: Univariate, Regression (residuals), any module needing histogram visualization
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n, dataSource }
 * - Highcharts library must be loaded
 * - jStat library must be loaded
 * 
 * Exports:
 * - displayHistogramView() - Main display function
 * - createHistogram() - Create/update histogram chart
 * - updateHistogram() - Slider update handler
 * - Helper functions for binning, decimals, range controls
 */

// Global variables for histogram view
let histogramChart = null;
let currentDecimals = 2;

/**
 * Display histogram view with descriptive statistics and interactive controls
 */
function displayHistogramView() {
  const { descriptive, n, column, dataSource } = resultsData;
  
  // Format all statistics with current decimal places
  const d = currentDecimals;
  const stats = {
    mean: parseFloat(descriptive.mean).toFixed(d),
    stdDev: parseFloat(descriptive.stdDev).toFixed(d),
    variance: parseFloat(descriptive.variance).toFixed(d),
    kurtosis: parseFloat(descriptive.kurtosis).toFixed(d),
    skewness: parseFloat(descriptive.skewness).toFixed(d),
    range: parseFloat(descriptive.range).toFixed(d),
    min: parseFloat(descriptive.min).toFixed(d),
    q1: parseFloat(descriptive.q1).toFixed(d),
    median: parseFloat(descriptive.median).toFixed(d),
    q3: parseFloat(descriptive.q3).toFixed(d),
    max: parseFloat(descriptive.max).toFixed(d)
  };
  
  // Update header
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  document.getElementById('resultsContent').innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <!-- Statistics Panel -->
    <div class="stats-panel">
      <div class="panel-heading">
        <span>Variable - Descriptive Statistics</span>
        <div style="display: flex; align-items: center; gap: 12px;">
          <label for="decimalsSelect" style="font-size: 12px; color: var(--text-muted); margin: 0;">Decimals:</label>
          <select id="decimalsSelect" onchange="updateDecimals()" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface-0); color: var(--text-primary);">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stats-frame">
          <table class="stats-table">
            <thead>
              <tr>
                <th>Count</th>
                <th>Average</th>
                <th>Std Dev</th>
                <th class="highlight">Variance</th>
                <th class="highlight">Kurtosis</th>
                <th class="highlight">Skewness</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${n}</td>
                <td>${stats.mean}</td>
                <td>${stats.stdDev}</td>
                <td class="highlight">${stats.variance}</td>
                <td class="highlight">${stats.kurtosis}</td>
                <td class="highlight">${stats.skewness}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="stats-frame">
          <table class="stats-table">
            <thead>
              <tr>
                <th class="highlight">Range</th>
                <th class="highlight">Minimum</th>
                <th class="highlight">Q25</th>
                <th>Median</th>
                <th class="highlight">Q75</th>
                <th class="highlight">Maximum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="highlight">${stats.range}</td>
                <td class="highlight">${stats.min}</td>
                <td class="highlight">${stats.q1}</td>
                <td>${stats.median}</td>
                <td class="highlight">${stats.q3}</td>
                <td class="highlight">${stats.max}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Histogram Panel -->
    <div class="histogram-panel">
      <div class="histogram-header">
        <!-- All Controls in One Row (Each in Frame) -->
        <div class="histogram-controls-row">
          <div class="control-frame">
            <label for="binningMethod">Binning Method:</label>
            <select id="binningMethod" onchange="updateBinningMethod()">
              <option value="manual">Manual</option>
              <option value="sturges">Sturges</option>
              <option value="scott">Scott</option>
              <option value="fd">FD</option>
              <option value="sqrt">√n</option>
              <option value="rice">Rice</option>
            </select>
          </div>
          <div class="control-frame" id="manualBinsControl">
            <label for="numBins">Bins:</label>
            <span id="binsValue">5</span>
            <input type="range" id="numBins" min="1" max="30" value="5" step="1" oninput="updateHistogram()">
          </div>
          <div class="control-frame">
            <label for="showNormalCurve">Normal:</label>
            <input type="checkbox" id="showNormalCurve" checked onchange="updateHistogram()">
          </div>
          <div class="control-frame range-control-frame">
            <label>Data Range:</label>
            <span class="range-label">Min</span>
            <span id="leftRangeValue" class="value-display">0</span>
            <div class="slider-container">
              <div class="slider-track"></div>
              <div id="activeRangeIndicator" class="active-range"></div>
              <input type="range" id="leftTruncation" min="0" max="100" value="0" step="1" style="position: absolute; width: 100%; background: transparent; z-index: 2;">
              <input type="range" id="rightTruncation" min="0" max="100" value="100" step="1" style="position: absolute; width: 100%; background: transparent; z-index: 1;">
            </div>
            <span id="rightRangeValue" class="value-display">100</span>
            <span class="range-label">Max</span>
            <button id="resetRanges" class="reset-button" onclick="resetRangeSliders()">Reset</button>
            <span class="remaining-n"><span id="remainingN">--</span></span>
          </div>
        </div>
      </div>
      
      <div id="histogram-chart"></div>
    </div>
  `;

  setTimeout(() => {
    initializeRangeSliders();
    updateDecimals();
    createHistogram(true);
  }, 100);
}

function createHistogram(animate = false) {
  if (!resultsData || !resultsData.rawData) {
    console.error('No data available for histogram');
    return;
  }

  const numBinsEl = document.getElementById('numBins');
  const showNormalCurveEl = document.getElementById('showNormalCurve');
  const chartContainer = document.getElementById('histogram-chart');
  
  if (!numBinsEl || !showNormalCurveEl || !chartContainer) {
    console.error('Histogram elements not found in DOM');
    return;
  }

  const data = getFilteredData();
  if (data.length === 0) {
    console.error('No data after filtering');
    return;
  }

  const numBins = parseInt(numBinsEl.value);
  const showNormalCurve = showNormalCurveEl.checked;
  const totalCount = data.length;
  
  const remainingNEl = document.getElementById('remainingN');
  if (remainingNEl) remainingNEl.textContent = totalCount;
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (data.length - 1);
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / numBins;

  const bins = new Array(numBins).fill(0);
  const binEdges = [];
  
  for (let i = 0; i <= numBins; i++) {
    binEdges.push(min + i * binWidth);
  }
  
  data.forEach(value => {
    let binIndex = Math.floor((value - min) / binWidth);
    if (binIndex >= numBins) binIndex = numBins - 1;
    if (binIndex < 0) binIndex = 0;
    bins[binIndex]++;
  });

  const categories = [];
  const frequencies = [];
  const percentages = [];
  
  for (let i = 0; i < numBins; i++) {
    const binStart = binEdges[i];
    const binEnd = binEdges[i + 1];
    categories.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    frequencies.push(bins[i]);
    const percentage = (bins[i] / totalCount * 100).toFixed(1);
    percentages.push(percentage);
  }

  let normalCurveData = [];
  if (showNormalCurve) {
    const points = 100;
    const range = max - min;
    const start = min - range * 0.1;
    const end = max + range * 0.1;
    const step = (end - start) / points;
    
    const maxFrequency = Math.max(...frequencies);
    const normalYValues = [];
    
    for (let i = 0; i <= points; i++) {
      const x = start + i * step;
      const z = (x - mean) / stdDev;
      const density = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
      normalYValues.push({ x, density });
    }
    
    const maxDensity = Math.max(...normalYValues.map(d => d.density));
    const normalScale = maxDensity > 0 ? maxFrequency / maxDensity * 0.8 : 1;
    
    normalCurveData = normalYValues.map(d => {
      const normalizedX = (d.x - min) / range;
      const categoryIndex = normalizedX * (numBins - 1);
      return [categoryIndex, d.density * normalScale];
    });
  }

  const textColor = document.body.classList.contains('theme-dark') ? '#ffffff' : '#1e293b';
  const gridColor = document.body.classList.contains('theme-dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  if (histogramChart) {
    histogramChart.destroy();
  }

  histogramChart = Highcharts.chart('histogram-chart', {
    chart: {
      backgroundColor: 'transparent',
      height: null,
      animation: animate,
      reflow: true
    },
    title: null,
    xAxis: {
      categories: categories,
      title: { text: 'Value Range', style: { color: textColor } },
      labels: {
        style: { color: textColor, fontSize: '11px' },
        rotation: 0,
        align: 'center'
      },
      gridLineColor: gridColor
    },
    yAxis: {
      title: { text: 'Frequency', style: { color: textColor } },
      labels: { style: { color: textColor } },
      gridLineColor: gridColor
    },
    legend: {
      enabled: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: { color: '#ffffff' },
      shared: true
    },
    plotOptions: {
      column: {
        animation: animate,
        groupPadding: 0.1,
        pointPadding: 0.05,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          formatter: function() {
            return percentages[this.point.index] + '%';
          },
          style: { color: textColor, fontSize: '10px', fontWeight: 'bold' },
          y: -5
        }
      },
      line: {
        animation: animate,
        marker: { enabled: false },
        lineWidth: 2,
        dashStyle: 'Dash'
      }
    },
    series: [
      {
        name: 'Frequency',
        type: 'column',
        data: frequencies,
        color: '#3b82f6'
      },
      ...(showNormalCurve ? [{
        name: 'Normal Curve',
        type: 'line',
        data: normalCurveData,
        color: '#f1c40f',
        yAxis: 0
      }] : [])
    ]
  });
}

function updateHistogram() {
  const bins = document.getElementById('numBins').value;
  document.getElementById('binsValue').textContent = bins;
  createHistogram(false);
}

function updateDecimals() {
  const { descriptive } = resultsData;
  currentDecimals = parseInt(document.getElementById('decimalsSelect').value);
  const d = currentDecimals;
  
  const statsMap = {
    mean: parseFloat(descriptive.mean).toFixed(d),
    stdDev: parseFloat(descriptive.stdDev).toFixed(d),
    variance: parseFloat(descriptive.variance).toFixed(d),
    kurtosis: parseFloat(descriptive.kurtosis).toFixed(d),
    skewness: parseFloat(descriptive.skewness).toFixed(d),
    range: parseFloat(descriptive.range).toFixed(d),
    min: parseFloat(descriptive.min).toFixed(d),
    q1: parseFloat(descriptive.q1).toFixed(d),
    median: parseFloat(descriptive.median).toFixed(d),
    q3: parseFloat(descriptive.q3).toFixed(d),
    max: parseFloat(descriptive.max).toFixed(d)
  };
  
  const tables = document.querySelectorAll('.stats-table');
  if (tables[0]) {
    const cells = tables[0].querySelectorAll('tbody td');
    cells[1].textContent = statsMap.mean;
    cells[2].textContent = statsMap.stdDev;
    cells[3].textContent = statsMap.variance;
    cells[4].textContent = statsMap.kurtosis;
    cells[5].textContent = statsMap.skewness;
  }
  if (tables[1]) {
    const cells = tables[1].querySelectorAll('tbody td');
    cells[0].textContent = statsMap.range;
    cells[1].textContent = statsMap.min;
    cells[2].textContent = statsMap.q1;
    cells[3].textContent = statsMap.median;
    cells[4].textContent = statsMap.q3;
    cells[5].textContent = statsMap.max;
  }
  
  const leftVal = document.getElementById('leftRangeValue');
  const rightVal = document.getElementById('rightRangeValue');
  if (leftVal && leftVal.dataset.rawValue) {
    leftVal.textContent = parseFloat(leftVal.dataset.rawValue).toFixed(d);
  }
  if (rightVal && rightVal.dataset.rawValue) {
    rightVal.textContent = parseFloat(rightVal.dataset.rawValue).toFixed(d);
  }
}

// Binning method calculators
function calculateBinsSturges(n) {
  return Math.ceil(Math.log2(n) + 1);
}

function calculateBinsScott(n, data) {
  const std = Math.sqrt(data.reduce((acc, val) => acc + Math.pow(val - (data.reduce((a,b)=>a+b)/n), 2), 0) / n);
  const h = 3.5 * std / Math.pow(n, 1/3);
  const range = Math.max(...data) - Math.min(...data);
  return Math.ceil(range / h);
}

function calculateBinsFD(n, data) {
  const sorted = [...data].sort((a,b)=>a-b);
  const q1 = sorted[Math.floor(n/4)];
  const q3 = sorted[Math.floor(3*n/4)];
  const iqr = q3 - q1;
  const h = 2 * iqr / Math.pow(n, 1/3);
  const range = Math.max(...data) - Math.min(...data);
  return Math.ceil(range / h);
}

function calculateBinsSqrt(n) {
  return Math.ceil(Math.sqrt(n));
}

function calculateBinsRice(n) {
  return Math.ceil(2 * Math.pow(n, 1/3));
}

function updateBinningMethod() {
  const method = document.getElementById('binningMethod').value;
  const numBinsInput = document.getElementById('numBins');
  const binsValue = document.getElementById('binsValue');
  const data = getFilteredData();
  
  if (method === 'manual') {
    numBinsInput.disabled = false;
    return;
  }
  
  let calculatedBins = 5;
  switch(method) {
    case 'sturges':
      calculatedBins = calculateBinsSturges(data.length);
      break;
    case 'scott':
      calculatedBins = calculateBinsScott(data.length, data);
      break;
    case 'fd':
      calculatedBins = calculateBinsFD(data.length, data);
      break;
    case 'sqrt':
      calculatedBins = calculateBinsSqrt(data.length);
      break;
    case 'rice':
      calculatedBins = calculateBinsRice(data.length);
      break;
  }
  
  numBinsInput.value = calculatedBins;
  binsValue.textContent = calculatedBins;
  numBinsInput.disabled = true;
  createHistogram(true);
}

// Range slider functions
let originalDataMin, originalDataMax;
let prevLeftPercent = 0;
let prevRightPercent = 100;
let updateTimeout = null;

function getFilteredData() {
  if (!resultsData || !resultsData.rawData) return [];
  
  const leftPercent = parseFloat(document.getElementById('leftTruncation')?.value || 0);
  const rightPercent = parseFloat(document.getElementById('rightTruncation')?.value || 100);
  
  const leftValue = originalDataMin + (originalDataMax - originalDataMin) * (leftPercent / 100);
  const rightValue = originalDataMin + (originalDataMax - originalDataMin) * (rightPercent / 100);
  
  return resultsData.rawData.filter(d => d >= leftValue && d <= rightValue);
}

function initializeRangeSliders() {
  if (!resultsData || !resultsData.rawData) return;
  
  originalDataMin = Math.min(...resultsData.rawData);
  originalDataMax = Math.max(...resultsData.rawData);
  
  const leftSlider = document.getElementById('leftTruncation');
  const rightSlider = document.getElementById('rightTruncation');
  
  if (!leftSlider || !rightSlider) return;
  
  updateTruncationControls();
  
  leftSlider.addEventListener('mousedown', () => {
    leftSlider.style.zIndex = '3';
    rightSlider.style.pointerEvents = 'none';
  });
  
  leftSlider.addEventListener('touchstart', () => {
    leftSlider.style.zIndex = '3';
    rightSlider.style.pointerEvents = 'none';
  });
  
  rightSlider.addEventListener('mousedown', () => {
    rightSlider.style.zIndex = '3';
    leftSlider.style.pointerEvents = 'none';
  });
  
  rightSlider.addEventListener('touchstart', () => {
    rightSlider.style.zIndex = '3';
    leftSlider.style.pointerEvents = 'none';
  });
  
  const resetZIndex = () => {
    leftSlider.style.zIndex = '';
    rightSlider.style.zIndex = '';
    leftSlider.style.pointerEvents = '';
    rightSlider.style.pointerEvents = '';
  };
  
  window.addEventListener('mouseup', resetZIndex);
  window.addEventListener('touchend', resetZIndex);
  
  leftSlider.addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateTruncationControls, 50);
  });
  
  rightSlider.addEventListener('input', () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateTruncationControls, 50);
  });
}

function percentToValue(percent) {
  return originalDataMin + (originalDataMax - originalDataMin) * (percent / 100);
}

function updateTruncationControls() {
  const leftSlider = document.getElementById('leftTruncation');
  const rightSlider = document.getElementById('rightTruncation');
  const leftDisplay = document.getElementById('leftRangeValue');
  const rightDisplay = document.getElementById('rightRangeValue');
  const activeRange = document.getElementById('activeRangeIndicator');
  
  if (!leftSlider || !rightSlider || !leftDisplay || !rightDisplay || !activeRange) return;
  
  let leftPercent = parseFloat(leftSlider.value);
  let rightPercent = parseFloat(rightSlider.value);
  
  if (leftPercent > rightPercent) {
    leftPercent = rightPercent;
    leftSlider.value = leftPercent;
  }
  if (rightPercent < leftPercent) {
    rightPercent = leftPercent;
    rightSlider.value = rightPercent;
  }
  
  const filteredData = getFilteredData();
  if (filteredData.length < 10) {
    leftSlider.value = prevLeftPercent;
    rightSlider.value = prevRightPercent;
    document.getElementById('remainingN').style.color = '#e74c3c';
    setTimeout(() => {
      document.getElementById('remainingN').style.color = '';
    }, 500);
    return;
  }
  
  prevLeftPercent = leftPercent;
  prevRightPercent = rightPercent;
  
  const leftValue = percentToValue(leftPercent);
  const rightValue = percentToValue(rightPercent);
  
  leftDisplay.textContent = leftValue.toFixed(currentDecimals);
  leftDisplay.dataset.rawValue = leftValue;
  rightDisplay.textContent = rightValue.toFixed(currentDecimals);
  rightDisplay.dataset.rawValue = rightValue;
  
  activeRange.style.left = leftPercent + '%';
  activeRange.style.width = (rightPercent - leftPercent) + '%';
  
  createHistogram(false);
}

function resetRangeSliders() {
  document.getElementById('leftTruncation').value = 0;
  document.getElementById('rightTruncation').value = 100;
  prevLeftPercent = 0;
  prevRightPercent = 100;
  updateTruncationControls();
  createHistogram(false);
}

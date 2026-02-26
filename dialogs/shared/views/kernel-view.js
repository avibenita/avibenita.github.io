/**
 * Kernel Density Estimation View - Shared Analysis Component
 * 
 * Can be used by: Univariate, Regression (residuals), any module needing smooth density visualization
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n }
 * - Highcharts library must be loaded
 * 
 * Exports:
 * - displayKernelView() - Main display function
 * - initializeKernelDensity() - Initialize controls and chart
 * - calculateKDE() - Core KDE calculation
 * - Kernel functions: gaussian, epanechnikov, triangular, uniform
 */

let kernelChart = null;
let currentKernelType = 'gaussian';
let currentBandwidth = null;

/**
 * Display kernel density estimation view
 */
function displayKernelView() {
  const { column, n, descriptive } = resultsData;
  
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  const content = document.getElementById('resultsContent');
  content.innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <div class="kernel-container">
      <!-- Top Row: Stats Cards + Controls -->
      <div class="kernel-top-row">
        <!-- Stats Cards Panel -->
        <div class="kernel-stats-panel">
          <div class="stat-card">
            <div class="stat-label">N</div>
            <div class="stat-value">${n}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Min</div>
            <div class="stat-value">${parseFloat(descriptive.min).toFixed(1)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mean</div>
            <div class="stat-value">${parseFloat(descriptive.mean).toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">St. Dev</div>
            <div class="stat-value">${parseFloat(descriptive.stdDev).toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Mode</div>
            <div class="stat-value">${descriptive.mode || 'N/A'}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Max</div>
            <div class="stat-value">${parseFloat(descriptive.max).toFixed(1)}</div>
          </div>
        </div>
        
        <!-- Controls Panel - Single Row -->
        <div class="kernel-controls-panel">
          <div class="control-group-inline">
            <label for="kernelType">Kernel:</label>
            <select id="kernelType" onchange="updateKernelDensity()">
              <option value="gaussian" selected>Gaussian</option>
              <option value="epanechnikov">Epanechnikov</option>
              <option value="triangular">Triangular</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>
          <div class="control-group-inline">
            <label for="bandwidth">Bandwidth:</label>
            <span id="bandwidthValue">1.00x</span>
            <input type="range" id="bandwidth" min="0.1" max="3" step="0.1" value="1" oninput="updateKernelDensity()" style="width: 120px;">
            <button class="reset-button" onclick="resetBandwidth()">Reset</button>
          </div>
        </div>
      </div>
      
      <!-- Chart -->
      <div id="kernelChart" class="kernel-chart-full"></div>
    </div>
  `;
  
  setTimeout(() => {
    initializeKernelDensity();
  }, 100);
}

/**
 * Kernel functions
 */
function gaussianKernel(u) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

function epanechnikovKernel(u) {
  return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
}

function triangularKernel(u) {
  return Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0;
}

function uniformKernel(u) {
  return Math.abs(u) <= 1 ? 0.5 : 0;
}

function getKernelFunction(type) {
  switch(type) {
    case 'gaussian': return gaussianKernel;
    case 'epanechnikov': return epanechnikovKernel;
    case 'triangular': return triangularKernel;
    case 'uniform': return uniformKernel;
    default: return gaussianKernel;
  }
}

/**
 * Calculate optimal bandwidth using Scott's rule
 */
function calculateOptimalBandwidth(data) {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return 1.06 * stdDev * Math.pow(n, -1/5);
}

/**
 * Calculate kernel density estimation
 */
function calculateKDE(data, kernelType, bandwidthMultiplier = 1) {
  const sortedData = [...data].sort((a, b) => a - b);
  const min = sortedData[0];
  const max = sortedData[sortedData.length - 1];
  const range = max - min;
  
  const h = calculateOptimalBandwidth(sortedData) * bandwidthMultiplier;
  currentBandwidth = h;
  
  const kernel = getKernelFunction(kernelType);
  
  const points = 200;
  const start = min - range * 0.2;
  const end = max + range * 0.2;
  const step = (end - start) / points;
  
  const densityData = [];
  
  for (let i = 0; i <= points; i++) {
    const x = start + i * step;
    let density = 0;
    
    for (let j = 0; j < sortedData.length; j++) {
      const u = (x - sortedData[j]) / h;
      density += kernel(u);
    }
    
    density = density / (sortedData.length * h);
    densityData.push([x, density]);
  }
  
  return { densityData, bandwidth: h };
}

/**
 * Initialize kernel density visualization
 */
function initializeKernelDensity() {
  if (!resultsData || !resultsData.rawData) return;
  
  currentKernelType = 'gaussian';
  const bandwidthSlider = document.getElementById('bandwidth');
  if (bandwidthSlider) bandwidthSlider.value = 1;
  
  updateKernelChart(true); // Animate on initial load
}

/**
 * Update kernel density chart
 */
function updateKernelChart(animate = false) {
  if (!resultsData || !resultsData.rawData) return;
  
  const kernelTypeEl = document.getElementById('kernelType');
  const bandwidthSliderEl = document.getElementById('bandwidth');
  const bandwidthValueEl = document.getElementById('bandwidthValue');
  
  if (!kernelTypeEl || !bandwidthSliderEl || !bandwidthValueEl) return;
  
  currentKernelType = kernelTypeEl.value;
  const bandwidthMultiplier = parseFloat(bandwidthSliderEl.value);
  
  const { densityData, bandwidth } = calculateKDE(resultsData.rawData, currentKernelType, bandwidthMultiplier);
  
  bandwidthValueEl.textContent = bandwidth.toFixed(4);
  
  const rawDataPoints = resultsData.rawData.map(val => [val, 0]);
  
  const textColor = document.body.classList.contains('theme-dark') ? '#ffffff' : '#1e293b';
  const gridColor = document.body.classList.contains('theme-dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  if (kernelChart) {
    kernelChart.destroy();
  }
  
  kernelChart = Highcharts.chart('kernelChart', {
    chart: {
      backgroundColor: 'transparent',
      height: null,
      reflow: true,
      animation: animate
    },
    title: {
      text: `Kernel Density Estimation (${currentKernelType.charAt(0).toUpperCase() + currentKernelType.slice(1)})`,
      style: { color: textColor, fontSize: '14px', fontWeight: 600 }
    },
    xAxis: {
      title: { text: 'Value', style: { color: textColor } },
      labels: { style: { color: textColor } },
      gridLineColor: gridColor
    },
    yAxis: {
      title: { text: 'Density', style: { color: textColor } },
      labels: { style: { color: textColor } },
      gridLineColor: gridColor
    },
    legend: {
      enabled: true,
      itemStyle: { color: textColor }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: { color: '#ffffff' },
      shared: false
    },
    plotOptions: {
      series: {
        animation: animate
      },
      area: {
        fillOpacity: 0.3,
        lineWidth: 2,
        marker: { enabled: false }
      },
      scatter: {
        marker: { radius: 3 }
      }
    },
    series: [
      {
        name: 'Density',
        type: 'area',
        data: densityData,
        color: '#3b82f6',
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, 'rgba(59, 130, 246, 0.3)'],
            [1, 'rgba(59, 130, 246, 0.05)']
          ]
        }
      },
      {
        name: 'Data Points (Rug)',
        type: 'scatter',
        data: rawDataPoints,
        color: '#e74c3c',
        marker: { radius: 2, symbol: 'circle' },
        tooltip: {
          pointFormat: 'Value: {point.x:.3f}'
        }
      }
    ]
  });
}

/**
 * Update kernel density when controls change
 */
function updateKernelDensity() {
  updateKernelChart();
}

/**
 * Reset bandwidth to default (Scott's rule)
 */
function resetBandwidth() {
  const bandwidthSlider = document.getElementById('bandwidth');
  if (bandwidthSlider) {
    bandwidthSlider.value = 1;
    updateKernelChart();
  }
}

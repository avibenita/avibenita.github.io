/**
 * Normality Tests View - Shared Analysis Component
 * 
 * Can be used by: Univariate, Regression (residuals testing), any module needing normality assessment
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n }
 * - Highcharts library must be loaded (for gauge chart)
 * - highcharts-more.js must be loaded
 * - solid-gauge.js must be loaded
 * - jStat library must be loaded
 * 
 * Exports:
 * - displayNormalityView() - Main display function
 * - Shapiro-Wilk, Jarque-Bera, Kolmogorov-Smirnov, Anderson-Darling tests
 * - Normality score calculation and gauge
 */

/**
 * Shapiro-Wilk Test
 */
function shapiroWilkTest(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  
  let a = [];
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const p = (i + 1 - 0.375) / (n + 0.25);
    const invNorm = jStat.normal.inv(p, 0, 1);
    a.push(invNorm);
  }
  
  const sumA2 = a.reduce((acc, val) => acc + val * val, 0);
  const normFactor = 1 / Math.sqrt(sumA2);
  a = a.map(val => val * normFactor);
  
  let b = 0;
  for (let i = 0; i < a.length; i++) {
    b += a[i] * (sorted[n - 1 - i] - sorted[i]);
  }
  
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const W = (b * b) / variance;
  
  let pValue;
  if (n < 50) {
    const logW = Math.log(1 - W);
    const logN = Math.log(n);
    const z = -logW - 2.27 + 0.8 * logN;
    pValue = 1 - jStat.normal.cdf(z, 0, 1);
  } else {
    const mu = 0.0038915 * Math.pow(Math.log(n) - 3, 3) + 0.37872 * Math.pow(Math.log(n) - 3, 2) - 0.08928 * (Math.log(n) - 3);
    const sigma = Math.exp(-0.0015395 * Math.pow(Math.log(n) - 3, 3) + 0.13186 * Math.pow(Math.log(n) - 3, 2) - 0.27791 * (Math.log(n) - 3) - 1.0063);
    const z = (Math.log(1 - W) - mu) / sigma;
    pValue = 1 - jStat.normal.cdf(z, 0, 1);
  }
  
  return { statistic: W, pValue };
}

/**
 * Jarque-Bera Test
 */
function jarqueBeraTest(data) {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const m3 = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) / n;
  const m4 = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) / n;
  
  const skewness = m3;
  const kurtosis = m4;
  
  const JB = (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis - 3, 2) / 4);
  const pValue = 1 - jStat.chisquare.cdf(JB, 2);
  
  return { statistic: JB, pValue, skewness, kurtosis };
}

/**
 * Kolmogorov-Smirnov Test
 */
function kolmogorovSmirnovTest(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  let maxD = 0;
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - mean) / stdDev;
    const Fn = (i + 1) / n;
    const Fz = jStat.normal.cdf(z, 0, 1);
    const D = Math.abs(Fn - Fz);
    if (D > maxD) maxD = D;
  }
  
  const sqrtN = Math.sqrt(n);
  const KS = maxD * sqrtN;
  const pValue = 1 - kolmogorovCDF(KS);
  
  return { statistic: maxD, pValue };
}

function kolmogorovCDF(x) {
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    sum += Math.pow(-1, k - 1) * Math.exp(-2 * k * k * x * x);
  }
  return 1 - 2 * sum;
}

/**
 * Anderson-Darling Test
 */
function andersonDarlingTest(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  let A2 = 0;
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - mean) / stdDev;
    const Fz = jStat.normal.cdf(z, 0, 1);
    const Fz_complement = 1 - jStat.normal.cdf((sorted[n - 1 - i] - mean) / stdDev, 0, 1);
    
    if (Fz > 0 && Fz < 1 && Fz_complement > 0 && Fz_complement < 1) {
      A2 += (2 * (i + 1) - 1) * (Math.log(Fz) + Math.log(Fz_complement));
    }
  }
  
  A2 = -n - (A2 / n);
  A2 = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  
  let pValue;
  if (A2 >= 0.6) {
    pValue = Math.exp(1.2937 - 5.709 * A2 + 0.0186 * A2 * A2);
  } else if (A2 >= 0.34) {
    pValue = Math.exp(0.9177 - 4.279 * A2 - 1.38 * A2 * A2);
  } else if (A2 >= 0.2) {
    pValue = 1 - Math.exp(-8.318 + 42.796 * A2 - 59.938 * A2 * A2);
  } else {
    pValue = 1 - Math.exp(-13.436 + 101.14 * A2 - 223.73 * A2 * A2);
  }
  
  pValue = Math.max(0, Math.min(1, pValue));
  
  return { statistic: A2, pValue };
}

/**
 * Calculate normality score (0-100)
 */
function calculateNormalityScore(sw, jb, ks, ad) {
  const weights = { sw: 0.35, jb: 0.25, ks: 0.20, ad: 0.20 };
  
  const score = 
    weights.sw * (sw.pValue * 100) +
    weights.jb * (jb.pValue * 100) +
    weights.ks * (ks.pValue * 100) +
    weights.ad * (ad.pValue * 100);
  
  return Math.round(score);
}

/**
 * Display normality tests view
 */
function displayNormalityView() {
  const { rawData, descriptive, column, n } = resultsData;
  
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  const sw = shapiroWilkTest(rawData);
  const jb = jarqueBeraTest(rawData);
  const ks = kolmogorovSmirnovTest(rawData);
  const ad = andersonDarlingTest(rawData);
  
  const normalityScore = calculateNormalityScore(sw, jb, ks, ad);
  
  const getResultClass = (pValue) => pValue >= 0.05 ? 'pass' : 'fail';
  const getResultText = (pValue) => pValue >= 0.05 ? 'Pass' : 'Fail';
  const getResultIcon = (pValue) => pValue >= 0.05 ? 'fa-circle-check' : 'fa-circle-xmark';
  
  document.getElementById('resultsContent').innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <div class="normality-container">
      <div class="normality-grid">
        <!-- Normality Score Gauge -->
        <div class="normality-card gauge-card">
          <div class="card-header">
            <h3>Normality Score</h3>
          </div>
          <div id="normalityGauge"></div>
          <div class="gauge-label">
            <strong>${normalityScore}/100</strong>
            <p>${normalityScore >= 70 ? 'Likely Normal' : normalityScore >= 40 ? 'Questionable' : 'Not Normal'}</p>
          </div>
        </div>
        
        <!-- Summary Statistics -->
        <div class="normality-card">
          <div class="card-header">
            <h3>Summary</h3>
          </div>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Mean</span>
              <span class="summary-value">${descriptive.mean.toFixed(3)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Std Dev</span>
              <span class="summary-value">${descriptive.stdDev.toFixed(3)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Skewness</span>
              <span class="summary-value">${jb.skewness.toFixed(3)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Kurtosis</span>
              <span class="summary-value">${jb.kurtosis.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Test Results Cards -->
      <div class="tests-grid">
        <div class="test-card">
          <div class="test-header">
            <i class="fa-solid fa-vial"></i>
            <h4>Shapiro-Wilk Test</h4>
          </div>
          <div class="test-body">
            <div class="test-stat">
              <span>W Statistic</span>
              <strong>${sw.statistic.toFixed(4)}</strong>
            </div>
            <div class="test-stat">
              <span>p-value</span>
              <strong>${sw.pValue.toFixed(4)}</strong>
            </div>
            <div class="test-result ${getResultClass(sw.pValue)}">
              <i class="fa-solid ${getResultIcon(sw.pValue)}"></i>
              ${getResultText(sw.pValue)} (α=0.05)
            </div>
          </div>
          <div class="test-info">Most powerful test for small to medium samples (n &lt; 50)</div>
        </div>
        
        <div class="test-card">
          <div class="test-header">
            <i class="fa-solid fa-chart-bar"></i>
            <h4>Jarque-Bera Test</h4>
          </div>
          <div class="test-body">
            <div class="test-stat">
              <span>JB Statistic</span>
              <strong>${jb.statistic.toFixed(4)}</strong>
            </div>
            <div class="test-stat">
              <span>p-value</span>
              <strong>${jb.pValue.toFixed(4)}</strong>
            </div>
            <div class="test-result ${getResultClass(jb.pValue)}">
              <i class="fa-solid ${getResultIcon(jb.pValue)}"></i>
              ${getResultText(jb.pValue)} (α=0.05)
            </div>
          </div>
          <div class="test-info">Tests skewness and kurtosis match normal distribution</div>
        </div>
        
        <div class="test-card">
          <div class="test-header">
            <i class="fa-solid fa-wave-square"></i>
            <h4>Kolmogorov-Smirnov</h4>
          </div>
          <div class="test-body">
            <div class="test-stat">
              <span>D Statistic</span>
              <strong>${ks.statistic.toFixed(4)}</strong>
            </div>
            <div class="test-stat">
              <span>p-value</span>
              <strong>${ks.pValue.toFixed(4)}</strong>
            </div>
            <div class="test-result ${getResultClass(ks.pValue)}">
              <i class="fa-solid ${getResultIcon(ks.pValue)}"></i>
              ${getResultText(ks.pValue)} (α=0.05)
            </div>
          </div>
          <div class="test-info">Measures maximum distance between empirical and theoretical CDF</div>
        </div>
        
        <div class="test-card">
          <div class="test-header">
            <i class="fa-solid fa-chart-line"></i>
            <h4>Anderson-Darling</h4>
          </div>
          <div class="test-body">
            <div class="test-stat">
              <span>A² Statistic</span>
              <strong>${ad.statistic.toFixed(4)}</strong>
            </div>
            <div class="test-stat">
              <span>p-value</span>
              <strong>${ad.pValue.toFixed(4)}</strong>
            </div>
            <div class="test-result ${getResultClass(ad.pValue)}">
              <i class="fa-solid ${getResultIcon(ad.pValue)}"></i>
              ${getResultText(ad.pValue)} (α=0.05)
            </div>
          </div>
          <div class="test-info">More sensitive to deviations in the tails than KS test</div>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    createNormalityGauge(normalityScore);
  }, 100);
}

/**
 * Create normality score gauge chart
 */
function createNormalityGauge(score) {
  const textColor = document.body.classList.contains('theme-dark') ? '#ffffff' : '#1e293b';
  
  Highcharts.chart('normalityGauge', {
    chart: {
      type: 'solidgauge',
      backgroundColor: 'transparent',
      height: 200
    },
    title: null,
    pane: {
      center: ['50%', '70%'],
      size: '100%',
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    tooltip: { enabled: false },
    yAxis: {
      min: 0,
      max: 100,
      stops: [
        [0.3, '#e74c3c'],
        [0.6, '#f39c12'],
        [1, '#27ae60']
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      labels: {
        y: 16,
        style: { color: textColor, fontSize: '10px' }
      }
    },
    plotOptions: {
      solidgauge: {
        dataLabels: {
          y: -25,
          borderWidth: 0,
          useHTML: true,
          format: '<div style="text-align:center"><span style="font-size:28px;color:' + textColor + '">{y}</span></div>'
        }
      }
    },
    series: [{
      name: 'Normality',
      data: [score],
      dataLabels: {
        format: '<div style="text-align:center"><span style="font-size:28px;color:' + textColor + '">{y}</span></div>'
      }
    }]
  });
}

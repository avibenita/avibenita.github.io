/**
 * Box Plot View - Shared Analysis Component
 * 
 * Can be used by: Univariate, Regression (residuals), any module needing distribution visualization
 * 
 * Requirements:
 * - Global variable: resultsData { rawData, descriptive, column, n }
 * - Highcharts library must be loaded
 * - highcharts-more.js module must be loaded (for boxplot chart type)
 * 
 * Exports:
 * - displayBoxPlotView() - Main display function
 * - calculateBoxPlotData() - Calculate box plot statistics
 * - createBoxPlotCharts() - Render both charts
 */

/**
 * Display box plot view with outlier detection
 */
function displayBoxPlotView() {
  const { descriptive, n, column, dataSource, rawData } = resultsData;
  
  if (!rawData || rawData.length === 0) {
    document.getElementById('resultsContent').innerHTML = `
      <div class="loading">
        <i class="fa-solid fa-exclamation-triangle" style="font-size: 40px; color: #dc2626; margin-bottom: 16px;"></i>
        <div style="color: #dc2626;">No data available for Box Plot</div>
      </div>
    `;
    return;
  }

  const sortedData = [...rawData].sort((a, b) => a - b);
  const boxData = calculateBoxPlotData(sortedData);
  
  document.getElementById('variableName').textContent = column || 'Variable';
  document.getElementById('sampleSize').textContent = `(n=${n})`;
  
  const content = document.getElementById('resultsContent');
  content.innerHTML = `
    <link rel="stylesheet" href="./shared/views/universal-popup-styles.css">
    
    <div class="boxplot-container">
      <div class="boxplot-panel">
        <div class="panel-heading">Box Plot with Outliers</div>
        <div id="boxWithOutliers"></div>
      </div>
      
      <div class="boxplot-panel">
        <div class="panel-heading">Box Plot Without Outliers + Outlier Points</div>
        <div id="boxWithoutOutliers"></div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    createBoxPlotCharts(boxData, column || 'Variable');
  }, 100);
}

/**
 * Calculate box plot data including outliers
 */
function calculateBoxPlotData(sortedData) {
  const n = sortedData.length;
  const min = sortedData[0];
  const max = sortedData[n - 1];
  
  const median = (sortedData[Math.floor((n - 1) / 2)] + sortedData[Math.ceil((n - 1) / 2)]) / 2;
  const q1 = (sortedData[Math.floor((n - 1) / 4)] + sortedData[Math.ceil((n - 1) / 4)]) / 2;
  const q3 = (sortedData[Math.floor((3 * (n - 1)) / 4)] + sortedData[Math.ceil((3 * (n - 1)) / 4)]) / 2;
  
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  const outliers = sortedData.filter(v => v < lowerFence || v > upperFence);
  
  const adjustedLow = sortedData.find(v => v >= lowerFence);
  const adjustedHigh = [...sortedData].reverse().find(v => v <= upperFence);
  
  return {
    boxWithOutliers: [min, q1, median, q3, max],
    boxWithoutOutliers: [adjustedLow, q1, median, q3, adjustedHigh],
    outliers: outliers
  };
}

/**
 * Build statistical labels for box plot
 */
function buildStatLabelSeries(boxArray, labelColor) {
  const labels = [
    { key: 'Min', y: boxArray[0], dx: 10 },
    { key: 'Q1', y: boxArray[1], dx: 10 },
    { key: 'Median', y: boxArray[2], dx: -10, align: 'right' },
    { key: 'Q3', y: boxArray[3], dx: 10 },
    { key: 'Max', y: boxArray[4], dx: 10 }
  ];
  
  return labels.map(l => ({
    x: 0,
    y: l.y,
    dataLabels: {
      enabled: true,
      formatter() { return `${l.key}: ${this.y.toFixed(1)}`; },
      style: { color: labelColor, fontSize: '10px', fontWeight: 600 },
      align: l.align || 'left',
      verticalAlign: 'middle',
      x: l.dx,
      y: 0,
      padding: 2,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 3
    }
  }));
}

/**
 * Create both box plot charts (with and without outliers)
 */
function createBoxPlotCharts(boxData, variableName) {
  const labelColor = document.body.classList.contains('theme-dark') ? '#ffa578' : '#f97316';
  const textColor = document.body.classList.contains('theme-dark') ? '#ffffff' : '#1e293b';
  const gridColor = document.body.classList.contains('theme-dark') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  const statLabelsWithOutliers = buildStatLabelSeries(boxData.boxWithOutliers, labelColor);
  const statLabelsWithoutOutliers = buildStatLabelSeries(boxData.boxWithoutOutliers, labelColor);
  
  // Chart 1: With Outliers
  Highcharts.chart('boxWithOutliers', {
    chart: {
      type: 'boxplot',
      inverted: true,
      backgroundColor: 'transparent',
      height: null,
      marginTop: 40,
      marginBottom: 50,
      marginLeft: 80,
      marginRight: 20,
      reflow: true
    },
    title: {
      text: 'With Outliers',
      style: { color: textColor, fontSize: '13px' },
      margin: 15
    },
    xAxis: {
      categories: [variableName],
      labels: { style: { color: textColor, fontSize: '11px' } },
      gridLineColor: gridColor,
      title: {
        text: 'Distribution',
        style: { color: textColor, fontSize: '11px' }
      }
    },
    yAxis: {
      labels: { style: { color: textColor, fontSize: '11px' } },
      gridLineColor: gridColor,
      title: {
        text: 'Values',
        style: { color: textColor, fontSize: '11px' }
      }
    },
    legend: { enabled: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: { color: '#ffffff' },
      formatter: function() {
        const point = this.point;
        return `<b>${variableName}</b><br/>` +
               `Min: ${point.low}<br/>` +
               `Q1: ${point.q1}<br/>` +
               `Median: ${point.median}<br/>` +
               `Q3: ${point.q3}<br/>` +
               `Max: ${point.high}`;
      }
    },
    plotOptions: {
      boxplot: {
        dataLabels: { enabled: false },
        fillColor: 'rgba(255, 255, 255, 0.1)',
        lineWidth: 2,
        medianWidth: 3,
        stemWidth: 1,
        whiskerLength: '50%',
        whiskerWidth: 2
      }
    },
    series: [
      {
        name: 'Box Plot',
        data: [boxData.boxWithOutliers],
        color: '#e94560'
      },
      {
        name: 'Stats',
        type: 'scatter',
        data: statLabelsWithOutliers,
        marker: { enabled: false },
        enableMouseTracking: false,
        tooltip: { enabled: false },
        showInLegend: false
      }
    ]
  });
  
  // Chart 2: Without Outliers + Outlier Points
  Highcharts.chart('boxWithoutOutliers', {
    chart: {
      type: 'boxplot',
      inverted: true,
      backgroundColor: 'transparent',
      height: null,
      marginTop: 40,
      marginBottom: 50,
      marginLeft: 80,
      marginRight: 20,
      reflow: true
    },
    title: {
      text: 'Without Outliers + Outlier Points',
      style: { color: textColor, fontSize: '13px' },
      margin: 15
    },
    xAxis: {
      categories: [variableName],
      labels: { style: { color: textColor, fontSize: '11px' } },
      gridLineColor: gridColor,
      title: {
        text: 'Distribution',
        style: { color: textColor, fontSize: '11px' }
      }
    },
    yAxis: {
      labels: { style: { color: textColor, fontSize: '11px' } },
      gridLineColor: gridColor,
      title: {
        text: 'Values',
        style: { color: textColor, fontSize: '11px' }
      }
    },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      layout: 'vertical',
      x: -10,
      y: 20,
      itemStyle: { color: textColor, fontSize: '10px' },
      itemMarginBottom: 2
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: { color: '#ffffff' }
    },
    plotOptions: {
      boxplot: {
        dataLabels: { enabled: false },
        fillColor: 'rgba(255, 255, 255, 0.1)',
        lineWidth: 2,
        medianWidth: 3,
        stemWidth: 1,
        whiskerLength: '50%',
        whiskerWidth: 2
      },
      scatter: {
        marker: { radius: 3 }
      }
    },
    series: [
      {
        name: 'Box Plot',
        data: [boxData.boxWithoutOutliers],
        color: '#00bcd4',
        tooltip: {
          pointFormatter: function() {
            return `<b>${variableName}</b><br/>` +
                   `Min: ${this.low}<br/>` +
                   `Q1: ${this.q1}<br/>` +
                   `Median: ${this.median}<br/>` +
                   `Q3: ${this.q3}<br/>` +
                   `Max: ${this.high}`;
          }
        }
      },
      {
        name: `Outliers (${boxData.outliers.length})`,
        type: 'scatter',
        data: boxData.outliers.map(v => [0, v]),
        marker: { radius: 3 },
        color: '#ff6b6b',
        tooltip: {
          pointFormat: 'Outlier: <b>{point.y}</b>'
        }
      },
      {
        name: 'Stats',
        type: 'scatter',
        data: statLabelsWithoutOutliers,
        marker: { enabled: false },
        enableMouseTracking: false,
        tooltip: { enabled: false },
        showInLegend: false
      }
    ]
  });
}

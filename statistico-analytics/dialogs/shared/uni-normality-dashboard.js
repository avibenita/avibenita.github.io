/**
 * Shared Normality Tests dashboard UI (matches normality-standalone.html).
 * Requires: jStat, Highcharts (+ highcharts-more), UniNormalityTests
 */
(function (global) {
  'use strict';

  const NT = global.UniNormalityTests;
  if (!NT) return;

  let gaugeChart = null;
  let modalAlpha = 0.05;

  function normalizeTestName(name) {
    return (name || '')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  function formatStat(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return value.toFixed(3);
  }

  function formatP(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (value < 0.001) return '0.000';
    return value.toFixed(3);
  }

  function formatCrit(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return value.toFixed(3);
  }

  function updateSummaryStats(tests, alpha, sampleSize) {
    const cutoff = typeof alpha === 'number' ? alpha : modalAlpha;
    const { pass, fail } = NT.countPassFail(tests, cutoff);
    const n = sampleSize != null ? sampleSize : tests.n;

    const passEl = document.getElementById('norm-pass-count');
    const failEl = document.getElementById('norm-fail-count');
    const sizeEl = document.getElementById('norm-sample-size');
    const sigEl = document.getElementById('norm-significance');
    const slider = document.getElementById('norm-alpha-slider');

    if (passEl) passEl.textContent = String(pass);
    if (failEl) failEl.textContent = String(fail);
    if (sizeEl) sizeEl.textContent = n != null ? String(n) : '—';
    if (sigEl) sigEl.textContent = cutoff.toFixed(2);
    if (slider && document.activeElement !== slider) slider.value = String(cutoff);
  }

  function updateTestCards(results, alpha, sampleSize) {
    const cutoff = typeof alpha === 'number' ? alpha : modalAlpha;
    let pass = 0;
    let fail = 0;

    results.forEach((testResult) => {
      const card = document.querySelector(`[data-test="${normalizeTestName(testResult.name)}"]`);
      if (!card) return;

      const detailRows = card.querySelectorAll('.detail-value');
      if (detailRows.length >= 3) {
        detailRows[0].textContent = formatStat(testResult.stat);
        detailRows[1].textContent = formatP(testResult.pval);
        detailRows[2].textContent = formatCrit(testResult.crit);
      }

      const badge = card.querySelector('.test-result');
      if (!badge) return;

      badge.style.backgroundColor = '';
      badge.style.color = '';
      if (testResult.pval !== null && Number.isFinite(testResult.pval)) {
        if (testResult.pval >= cutoff) {
          badge.textContent = 'PASS';
          badge.classList.remove('fail');
          badge.classList.add('pass');
          pass += 1;
        } else {
          badge.textContent = 'FAIL';
          badge.classList.remove('pass');
          badge.classList.add('fail');
          fail += 1;
        }
      } else {
        badge.textContent = '—';
        badge.classList.remove('pass', 'fail');
      }
    });

    const passEl = document.getElementById('norm-pass-count');
    const failEl = document.getElementById('norm-fail-count');
    const sizeEl = document.getElementById('norm-sample-size');
    const sigEl = document.getElementById('norm-significance');
    if (passEl) passEl.textContent = String(pass);
    if (failEl) failEl.textContent = String(fail);
    if (sizeEl && sampleSize != null) sizeEl.textContent = String(sampleSize);
    if (sigEl) sigEl.textContent = cutoff.toFixed(2);
  }

  function resetTestCards() {
    document.querySelectorAll('.test-card').forEach((card) => {
      card.querySelectorAll('.detail-value').forEach((d) => {
        d.textContent = '—';
      });
      const badge = card.querySelector('.test-result');
      if (badge) {
        badge.textContent = '—';
        badge.classList.remove('pass', 'fail');
      }
    });
    updateGauge(0);
    updateSummaryStats([], modalAlpha, '—');
  }

  function initGauge(elementId) {
    const targetId = elementId || 'gauge-chart';
    if (typeof Highcharts === 'undefined') return null;
    if (gaugeChart && gaugeChart.renderTo && gaugeChart.renderTo.id === targetId) {
      return gaugeChart;
    }

    gaugeChart = Highcharts.chart(targetId, {
      chart: {
        type: 'gauge',
        backgroundColor: 'transparent',
        height: 120,
        plotBackgroundColor: null,
        plotBackgroundImage: null,
        plotBorderWidth: 0,
        plotShadow: false
      },
      title: null,
      exporting: { enabled: false },
      credits: { enabled: false },
      pane: {
        startAngle: -90,
        endAngle: 90,
        background: null,
        center: ['50%', '75%'],
        size: '120%'
      },
      yAxis: {
        min: 0,
        max: 100,
        minorTickInterval: 'auto',
        minorTickWidth: 1,
        minorTickLength: 5,
        minorTickPosition: 'inside',
        minorTickColor: '#666',
        tickPixelInterval: 30,
        tickWidth: 2,
        tickPosition: 'inside',
        tickLength: 10,
        tickColor: '#666',
        labels: { distance: 12, rotation: 'auto', style: { color: '#ccc', fontSize: '10px' } },
        plotBands: [
          { from: 0, to: 40, color: '#e74c3c', thickness: '60%' },
          { from: 40, to: 70, color: '#f1c40f', thickness: '60%' },
          { from: 70, to: 100, color: '#2ecc71', thickness: '60%' }
        ]
      },
      plotOptions: {
        gauge: {
          dial: {
            radius: '80%',
            backgroundColor: '#ddd',
            baseWidth: 8,
            topWidth: 1,
            baseLength: '0%',
            rearLength: '0%'
          },
          pivot: { backgroundColor: '#ddd', radius: 5 }
        }
      },
      series: [{
        name: 'NSI',
        data: [0],
        dataLabels: {
          format: '<div style="text-align:center"><span style="font-size:22px;color:#fff">{y}</span></div>',
          borderWidth: 0,
          y: -15,
          useHTML: true
        },
        tooltip: { valueSuffix: ' NSI' }
      }]
    });

    return gaugeChart;
  }

  function updateGauge(score) {
    const value = Number.isFinite(score) ? score : 0;
    if (gaugeChart && gaugeChart.series && gaugeChart.series[0]) {
      gaugeChart.series[0].points[0].update(value);
    }
  }

  function runBattery(rawData, alpha) {
    modalAlpha = typeof alpha === 'number' ? alpha : modalAlpha;
    if (!Array.isArray(rawData) || rawData.length === 0) return null;
    return NT.runAll(rawData, modalAlpha);
  }

  function renderDashboard(rawData, options) {
    const opts = options || {};
    modalAlpha = typeof opts.alpha === 'number' ? opts.alpha : modalAlpha;

    if (!Array.isArray(rawData) || rawData.length === 0) {
      resetTestCards();
      return null;
    }

    const tests = NT.runAll(rawData, modalAlpha);
    const cards = NT.toCardResults(tests, modalAlpha);
    const nsi = NT.calculateNSI(tests);

    updateSummaryStats(tests, modalAlpha, opts.sampleSize != null ? opts.sampleSize : tests.n);
    updateTestCards(cards, modalAlpha);
    initGauge(opts.gaugeId || 'gauge-chart');
    updateGauge(nsi);

    return { tests, cards, nsi };
  }

  function setAlpha(value) {
    modalAlpha = parseFloat(value) || 0.05;
    if (typeof global._normalityLastRawData !== 'undefined' && global._normalityLastRawData) {
      renderDashboard(global._normalityLastRawData, {
        alpha: modalAlpha,
        sampleSize: global._normalityLastSampleSize,
        gaugeId: global._normalityGaugeId || 'gauge-chart'
      });
    }
  }

  global.UniNormalityDashboard = {
    initGauge,
    updateGauge,
    updateTestCards,
    updateSummaryStats,
    resetTestCards,
    runBattery,
    renderDashboard,
    setAlpha,
    normalizeTestName,
    getAlpha: () => modalAlpha
  };

  global.updateNormalityAlpha = setAlpha;
}(typeof window !== 'undefined' ? window : globalThis));

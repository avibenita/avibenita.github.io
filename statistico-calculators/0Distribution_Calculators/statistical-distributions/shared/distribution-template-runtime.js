(function () {
  "use strict";

  const distName = (document.body?.dataset?.distribution || "").toLowerCase();

  function detectDistribution() {
    const p = window.location.pathname.toLowerCase();
    if (distName) return distName;
    if (p.includes("normal")) return "normaldistribution";
    if (p.includes("uniform")) return "uniformdistribution";
    return "";
  }

  const configs = {
    normaldistribution: {
      title: "Normal Distribution Calculator",
      about: "About Normal Distribution...",
      params: [
        { id: "mean", label: "Mean (mu)", sub: "Center of the distribution", defaultValue: 0 },
        { id: "stddev", label: "Standard Deviation (sigma)", sub: "Spread (must be greater than 0)", defaultValue: 1 },
      ],
      rangeOptions: [
        { value: "2", label: "2σ" },
        { value: "3", label: "3σ" },
        { value: "4", label: "4σ" },
        { value: "5", label: "5σ" },
        { value: "6", label: "6σ" },
      ],
      defaults: { range: "4", precision: 3 },
      stats: [
        { key: "mean", label: "Mean" },
        { key: "std", label: "Std Dev" },
        { key: "variance", label: "Variance" },
        { key: "skewness", label: "Skewness" },
      ],
      validate: (p) => Number.isFinite(p.mean) && Number.isFinite(p.stddev) && p.stddev > 0,
      cdf: (x, p) => window.jStat.normal.cdf(x, p.mean, p.stddev),
      pdf: (x, p) => window.jStat.normal.pdf(x, p.mean, p.stddev),
      inv: (q, p) => window.jStat.normal.inv(q, p.mean, p.stddev),
      statsValues: (p) => ({
        mean: p.mean,
        std: p.stddev,
        variance: p.stddev * p.stddev,
        skewness: 0,
      }),
      chartDomain: (p, rangeValue) => {
        const k = Number(rangeValue || 4);
        const s = Math.max(0.01, p.stddev);
        return { min: p.mean - k * s, max: p.mean + k * s };
      },
    },
    uniformdistribution: {
      title: "Uniform Distribution Calculator",
      about: "About Uniform Distribution...",
      params: [
        { id: "minValue", label: "Minimum Value (a)", sub: "Lower bound of the distribution", defaultValue: 0 },
        { id: "maxValue", label: "Maximum Value (b)", sub: "Upper bound (must be > a)", defaultValue: 10 },
      ],
      rangeOptions: [
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended" },
        { value: "wide", label: "Wide" },
      ],
      defaults: { range: "extended", precision: 2 },
      stats: [
        { key: "min", label: "a (Min)" },
        { key: "max", label: "b (Max)" },
        { key: "mean", label: "Mean" },
        { key: "std", label: "Std Dev" },
      ],
      validate: (p) => Number.isFinite(p.minValue) && Number.isFinite(p.maxValue) && p.maxValue > p.minValue,
      cdf: (x, p) => {
        if (x <= p.minValue) return 0;
        if (x >= p.maxValue) return 1;
        return (x - p.minValue) / (p.maxValue - p.minValue);
      },
      pdf: (x, p) => {
        if (x < p.minValue || x > p.maxValue) return 0;
        return 1 / (p.maxValue - p.minValue);
      },
      inv: (q, p) => p.minValue + q * (p.maxValue - p.minValue),
      statsValues: (p) => {
        const w = p.maxValue - p.minValue;
        return {
          min: p.minValue,
          max: p.maxValue,
          mean: (p.minValue + p.maxValue) / 2,
          std: Math.sqrt((w * w) / 12),
        };
      },
      chartDomain: (p, rangeValue) => {
        const w = Math.max(1e-9, p.maxValue - p.minValue);
        const padMultiplier = rangeValue === "wide" ? 1 : rangeValue === "standard" ? 0.2 : 0.5;
        const pad = w * padMultiplier;
        return { min: p.minValue - pad, max: p.maxValue + pad };
      },
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  let pdfChart = null;
  let cdfChart = null;
  let combinedChart = null;
  let currentTab = "pdf";

  function setRadioSelection() {
    document.querySelectorAll(".radio-option").forEach((el) => el.classList.remove("selected"));
    const checked = document.querySelector('input[name="calcType"]:checked');
    if (checked) {
      const row = checked.closest(".radio-option");
      if (row) row.classList.add("selected");
    }
  }

  function getParams(cfg) {
    return cfg.params.reduce((acc, p) => {
      acc[p.id] = parseFloat($(p.id)?.value);
      return acc;
    }, {});
  }

  function formatNum(v, precision) {
    return Number.isFinite(v) ? Number(v).toFixed(precision) : "--";
  }

  function populateContextInput() {
    const wrap = $("inputSection");
    if (!wrap) return;
    const type = document.querySelector('input[name="calcType"]:checked')?.value || "probability";
    if (type === "probability") {
      wrap.innerHTML = '<div class="input-group"><label>X Value</label><input class="input-field" id="xValue" type="number" step="0.1" value="0"/></div>';
    } else if (type === "between") {
      wrap.innerHTML = '<div class="mean-std-row"><div class="input-group"><label>Lower Bound (a)</label><input class="input-field" id="lowerBound" type="number" step="0.1" value="-1"/></div><div class="input-group"><label>Upper Bound (b)</label><input class="input-field" id="upperBound" type="number" step="0.1" value="1"/></div></div>';
    } else {
      wrap.innerHTML = '<div class="input-group"><label>Probability (0 to 1)</label><input class="input-field" id="probability" type="number" min="0" max="1" step="0.01" value="0.5"/></div>';
    }
    wrap.querySelectorAll("input").forEach((i) => i.addEventListener("input", calculateAndRender));
  }

  function updateStats(cfg, params, precision) {
    const values = cfg.statsValues(params);
    cfg.stats.forEach((s, idx) => {
      const valueEl = $("stat" + String.fromCharCode(65 + idx));
      const labelEl = $("stat" + String.fromCharCode(65 + idx) + "Label");
      if (valueEl) valueEl.textContent = formatNum(values[s.key], precision);
      if (labelEl) labelEl.textContent = s.label;
    });
  }

  function buildSeries(cfg, params, domain) {
    const n = 220;
    const step = (domain.max - domain.min) / (n - 1);
    const pdf = [];
    const cdf = [];
    for (let i = 0; i < n; i += 1) {
      const x = domain.min + i * step;
      pdf.push([x, cfg.pdf(x, params)]);
      cdf.push([x, cfg.cdf(x, params)]);
    }
    return { pdf, cdf };
  }

  function buildShadedPdfSeries(pdfSeries, shadeRange) {
    if (!shadeRange || !Number.isFinite(shadeRange.min) || !Number.isFinite(shadeRange.max)) {
      return [];
    }
    const lo = Math.min(shadeRange.min, shadeRange.max);
    const hi = Math.max(shadeRange.min, shadeRange.max);
    return pdfSeries.map(([x, y]) => (x >= lo && x <= hi ? [x, y] : [x, null]));
  }

  function renderCharts(cfg, params, shadeRange) {
    if (typeof window.Highcharts === "undefined") return;
    const rangeValue = $("chartRange")?.value || cfg.defaults.range;
    const domain = cfg.chartDomain(params, rangeValue);
    const series = buildSeries(cfg, params, domain);
    const shadedPdf = buildShadedPdfSeries(series.pdf, {
      min: Math.max(domain.min, shadeRange?.min ?? domain.min),
      max: Math.min(domain.max, shadeRange?.max ?? domain.max),
    });

    const base = {
      chart: { backgroundColor: "transparent" },
      title: { text: null },
      credits: { enabled: false },
      exporting: { enabled: false },
      xAxis: { lineColor: "rgba(255,255,255,0.25)", labels: { style: { color: "#d2e3ff" } } },
      yAxis: { title: { text: null }, gridLineColor: "rgba(255,255,255,0.08)", labels: { style: { color: "#d2e3ff" } } },
      legend: { itemStyle: { color: "#d2e3ff" } },
      tooltip: { shared: true, backgroundColor: "rgba(8,18,34,0.94)", style: { color: "#f0f6ff" } },
    };

    if (pdfChart) pdfChart.destroy();
    if (cdfChart) cdfChart.destroy();
    if (combinedChart) combinedChart.destroy();

    pdfChart = window.Highcharts.chart("pdfChart", {
      ...base,
      series: [
        {
          name: "Shaded Area",
          type: "area",
          data: shadedPdf,
          color: "rgba(255, 165, 120, 0.28)",
          lineWidth: 0,
          marker: { enabled: false },
        },
        { name: "Probability Density", type: "line", data: series.pdf, color: "#ffa578", lineWidth: 2.5 },
      ],
    });
    cdfChart = window.Highcharts.chart("cdfChart", {
      ...base,
      series: [{ name: "Cumulative Probability", type: "line", data: series.cdf, color: "#7cc5ff", lineWidth: 2.5 }],
    });
    combinedChart = window.Highcharts.chart("combinedChart", {
      ...base,
      yAxis: [{ title: { text: null }, gridLineColor: "rgba(255,255,255,0.08)", labels: { style: { color: "#d2e3ff" } } }],
      series: [
        {
          name: "Shaded Area",
          type: "area",
          data: shadedPdf,
          color: "rgba(255, 165, 120, 0.24)",
          lineWidth: 0,
          marker: { enabled: false },
        },
        { name: "PDF", type: "line", data: series.pdf, color: "#ffa578", lineWidth: 2.5 },
        { name: "CDF", type: "line", data: series.cdf, color: "#7cc5ff", lineWidth: 2.5 },
      ],
    });
  }

  function calculateAndRender() {
    const key = detectDistribution();
    const cfg = configs[key];
    if (!cfg) return;
    const precision = Math.max(0, Math.min(10, parseInt($("precision")?.value || String(cfg.defaults.precision), 10)));
    const params = getParams(cfg);

    if (!cfg.validate(params)) {
      $("mainResult").textContent = "Invalid input";
      $("equationText").textContent = "Check parameter constraints.";
      $("percentageText").textContent = "";
      return;
    }

    const type = document.querySelector('input[name="calcType"]:checked')?.value || "probability";
    let result = 0;
    let expression = "";
    let explanation = "";
    let percentageText = "";
    let shadeMin = Number.NEGATIVE_INFINITY;
    let shadeMax = Number.POSITIVE_INFINITY;

    if (type === "probability") {
      const x = parseFloat($("xValue")?.value || "0");
      result = cfg.cdf(x, params);
      expression = `P(X <= ${formatNum(x, precision)})`;
      explanation = "Probability up to the specified x-value.";
      percentageText = `(${formatNum(result * 100, precision)}%)`;
      $("equationText").textContent = `${expression} = ${formatNum(result, precision)}`;
      shadeMax = x;
    } else if (type === "between") {
      const a = parseFloat($("lowerBound")?.value || "0");
      const b = parseFloat($("upperBound")?.value || "0");
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      result = Math.max(0, cfg.cdf(hi, params) - cfg.cdf(lo, params));
      expression = `P(${formatNum(lo, precision)} <= X <= ${formatNum(hi, precision)})`;
      explanation = "Probability between lower and upper bounds.";
      percentageText = `(${formatNum(result * 100, precision)}%)`;
      $("equationText").textContent = `${expression} = ${formatNum(result, precision)}`;
      shadeMin = lo;
      shadeMax = hi;
    } else {
      const p = Math.max(0, Math.min(1, parseFloat($("probability")?.value || "0.5")));
      result = cfg.inv(p, params);
      expression = `Quantile for p = ${formatNum(p, precision)}`;
      explanation = "Returned x-value at cumulative probability p.";
      percentageText = "";
      $("equationText").textContent = `X = ${formatNum(result, precision)}`;
      shadeMax = result;
    }

    $("mainResult").textContent = formatNum(result, precision);
    $("heroExpression").textContent = expression;
    $("explanationLine").textContent = explanation;
    $("percentageText").textContent = percentageText;
    updateStats(cfg, params, precision);
    renderCharts(cfg, params, { min: shadeMin, max: shadeMax });
  }

  function initTabs() {
    const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        currentTab = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        ["pdf", "cdf", "both"].forEach((k) => {
          const pane = $(k + "Tab");
          if (pane) pane.classList.toggle("active", k === currentTab);
        });
      });
    });
  }

  function initAboutModal() {
    const modal = $("aboutModal");
    const openBtn = $("aboutBtn");
    const closeBtn = $("closeAboutBtn");
    if (!modal || !openBtn || !closeBtn) return;
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    });
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "auto";
      }
    });
  }

  function initReset(cfg) {
    const btn = $("resetBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      cfg.params.forEach((p) => {
        if ($(p.id)) $(p.id).value = String(p.defaultValue);
      });
      const range = $("chartRange");
      if (range) range.value = cfg.defaults.range;
      const precision = $("precision");
      if (precision) precision.value = String(cfg.defaults.precision);
      const probRadio = document.querySelector('input[name="calcType"][value="probability"]');
      if (probRadio) probRadio.checked = true;
      populateContextInput();
      setRadioSelection();
      calculateAndRender();
    });
  }

  function initDistributionTemplate() {
    const key = detectDistribution();
    const cfg = configs[key];
    if (!cfg) return;

    document.title = cfg.title;
    const h1 = document.querySelector(".header h1");
    if (h1) h1.innerHTML = `<i class="fas fa-chart-line"></i> ${cfg.title}`;

    const aboutBtn = $("aboutBtn");
    if (aboutBtn) aboutBtn.innerHTML = `<i class="fas fa-info-circle"></i> ${cfg.about}`;

    const groups = Array.from(document.querySelectorAll(".control-block-inputs .input-group"));
    cfg.params.forEach((p, i) => {
      const g = groups[i];
      if (!g) return;
      const label = g.querySelector("label");
      const input = g.querySelector("input");
      if (label) {
        label.innerHTML = `${p.label}<small style="color: #bbb; font-weight: normal; display: block; margin-top: 2px;">${p.sub}</small>`;
      }
      if (input) {
        input.id = p.id;
        input.value = String(p.defaultValue);
        input.addEventListener("input", calculateAndRender);
      }
    });

    const range = $("chartRange");
    if (range) {
      range.innerHTML = cfg.rangeOptions.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
      range.value = cfg.defaults.range;
      range.addEventListener("change", calculateAndRender);
    }

    const precision = $("precision");
    if (precision) {
      precision.value = String(cfg.defaults.precision);
      precision.addEventListener("change", calculateAndRender);
    }

    document.querySelectorAll('input[name="calcType"]').forEach((r) => {
      r.addEventListener("change", () => {
        populateContextInput();
        setRadioSelection();
        calculateAndRender();
      });
    });

    initTabs();
    initAboutModal();
    initReset(cfg);
    populateContextInput();
    setRadioSelection();
    calculateAndRender();
  }

  document.addEventListener("DOMContentLoaded", initDistributionTemplate);
})();

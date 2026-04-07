(function () {
  "use strict";

  const COMPONENT_ID = "statisticoRandomSamplesComponent";

  function getNumber(id) {
    const el = document.getElementById(id);
    if (!el) return NaN;
    return parseFloat(el.value);
  }

  function boxMuller() {
    let u1 = 0;
    while (u1 === 0) u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  function sampleBinomial(n, p) {
    let x = 0;
    for (let i = 0; i < n; i += 1) {
      if (Math.random() < p) x += 1;
    }
    return x;
  }

  function samplePoisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  function sampleGeometric(p) {
    if (p >= 1) return 1;
    return Math.floor(Math.log(1 - Math.random()) / Math.log(1 - p)) + 1;
  }

  function sampleHypergeometric(N, K, n) {
    let successesLeft = K;
    let populationLeft = N;
    let successes = 0;
    for (let draw = 0; draw < n; draw += 1) {
      if (Math.random() < successesLeft / populationLeft) {
        successes += 1;
        successesLeft -= 1;
      }
      populationLeft -= 1;
    }
    return successes;
  }

  function distConfigFromPath() {
    const path = (window.location.pathname || "").toLowerCase();
    const hasJstat = typeof window.jStat !== "undefined";

    const withJstatInv = (fn, fallbackLabel) => ({
      sampleOne: fn,
      requiresJstat: !hasJstat,
      jstatMissingMessage: "jStat is required for random sampling in this distribution.",
      fallbackLabel,
    });

    if (path.includes("normal.html")) {
      return {
        name: "Normal Distribution",
        getParams: () => ({ mean: getNumber("mean"), stddev: getNumber("stddev") }),
        validate: (p) => Number.isFinite(p.mean) && Number.isFinite(p.stddev) && p.stddev > 0,
        sampleOne: (p) => p.mean + p.stddev * boxMuller(),
      };
    }
    if (path.includes("binomialdistribution.html")) {
      return {
        name: "Binomial Distribution",
        getParams: () => ({ n: Math.round(getNumber("nTrials")), p: getNumber("pSuccess") }),
        validate: (p) => Number.isFinite(p.n) && p.n >= 1 && Number.isFinite(p.p) && p.p >= 0 && p.p <= 1,
        sampleOne: (p) => sampleBinomial(p.n, p.p),
      };
    }
    if (path.includes("poissondistribution.html")) {
      return {
        name: "Poisson Distribution",
        getParams: () => ({ lambda: getNumber("lambda") }),
        validate: (p) => Number.isFinite(p.lambda) && p.lambda > 0,
        sampleOne: (p) => samplePoisson(p.lambda),
      };
    }
    if (path.includes("exponentialdistribution.html")) {
      return {
        name: "Exponential Distribution",
        getParams: () => ({ lambda: getNumber("lambda") }),
        validate: (p) => Number.isFinite(p.lambda) && p.lambda > 0,
        sampleOne: (p) => -Math.log(1 - Math.random()) / p.lambda,
      };
    }
    if (path.includes("uniformdistribution.html")) {
      return {
        name: "Uniform Distribution",
        getParams: () => ({ min: getNumber("minValue"), max: getNumber("maxValue") }),
        validate: (p) => Number.isFinite(p.min) && Number.isFinite(p.max) && p.max > p.min,
        sampleOne: (p) => p.min + Math.random() * (p.max - p.min),
      };
    }
    if (path.includes("betadistribution.html")) {
      return {
        name: "Beta Distribution",
        getParams: () => ({ alpha: getNumber("alpha"), beta: getNumber("beta") }),
        validate: (p) => Number.isFinite(p.alpha) && Number.isFinite(p.beta) && p.alpha > 0 && p.beta > 0,
        ...withJstatInv((p) => window.jStat.beta.inv(Math.random(), p.alpha, p.beta), "Beta"),
      };
    }
    if (path.includes("chisquare.html")) {
      return {
        name: "Chi-Square Distribution",
        getParams: () => ({ df: getNumber("degreesOfFreedom") }),
        validate: (p) => Number.isFinite(p.df) && p.df > 0,
        ...withJstatInv((p) => window.jStat.chisquare.inv(Math.random(), p.df), "Chi-Square"),
      };
    }
    if (path.includes("tdistribution.html")) {
      return {
        name: "t-Distribution",
        getParams: () => ({ df: getNumber("degreesOfFreedom") }),
        validate: (p) => Number.isFinite(p.df) && p.df > 0,
        ...withJstatInv((p) => window.jStat.studentt.inv(Math.random(), p.df), "t"),
      };
    }
    if (path.includes("fdistribution.html")) {
      return {
        name: "F Distribution",
        getParams: () => ({ df1: getNumber("df1"), df2: getNumber("df2") }),
        validate: (p) => Number.isFinite(p.df1) && Number.isFinite(p.df2) && p.df1 > 0 && p.df2 > 0,
        ...withJstatInv((p) => window.jStat.centralF.inv(Math.random(), p.df1, p.df2), "F"),
      };
    }
    if (path.includes("weibulldistribution.html")) {
      return {
        name: "Weibull Distribution",
        getParams: () => ({ shape: getNumber("shape"), scale: getNumber("scale") }),
        validate: (p) => Number.isFinite(p.shape) && Number.isFinite(p.scale) && p.shape > 0 && p.scale > 0,
        sampleOne: (p) => p.scale * Math.pow(-Math.log(1 - Math.random()), 1 / p.shape),
      };
    }
    if (path.includes("lognormaldistribution.html")) {
      return {
        name: "Log-Normal Distribution",
        getParams: () => ({ mu: getNumber("mu"), sigma: getNumber("sigma") }),
        validate: (p) => Number.isFinite(p.mu) && Number.isFinite(p.sigma) && p.sigma > 0,
        sampleOne: (p) => Math.exp(p.mu + p.sigma * boxMuller()),
      };
    }
    if (path.includes("geometricdistribution.html")) {
      return {
        name: "Geometric Distribution",
        getParams: () => ({ p: getNumber("p-input") }),
        validate: (p) => Number.isFinite(p.p) && p.p > 0 && p.p <= 1,
        sampleOne: (p) => sampleGeometric(p.p),
      };
    }
    if (path.includes("hypergeometricdistribution.html")) {
      return {
        name: "Hypergeometric Distribution",
        getParams: () => ({
          N: Math.round(getNumber("N-input")),
          K: Math.round(getNumber("K-input")),
          n: Math.round(getNumber("n-input")),
        }),
        validate: (p) =>
          Number.isFinite(p.N) &&
          Number.isFinite(p.K) &&
          Number.isFinite(p.n) &&
          p.N > 0 &&
          p.K >= 0 &&
          p.K <= p.N &&
          p.n >= 0 &&
          p.n <= p.N,
        sampleOne: (p) => sampleHypergeometric(p.N, p.K, p.n),
      };
    }
    return null;
  }

  function injectStyles() {
    if (document.getElementById("srng-style")) return;
    const style = document.createElement("style");
    style.id = "srng-style";
    style.textContent = `
.srng-button-wrap { margin: 10px 0 12px; display:flex; justify-content:center; }
.srng-trigger {
  width: min(280px, 78%);
  display:block;
  margin:0 auto;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border: 1px solid rgba(46, 204, 113, 0.7);
  color: #ffffff;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
  transition: all 0.25s ease;
  text-align:center;
}
.srng-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(46, 204, 113, 0.3);
  border-color: rgba(46, 204, 113, 0.9);
}
.srng-modal {
  position: fixed;
  inset: 0;
  background: rgba(4, 10, 20, 0.76);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
  backdrop-filter: blur(4px);
}
.srng-modal.active { display:flex; }
.srng-panel {
  width: min(900px, 96vw);
  max-height: 88vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0c1a31 0%, #0a1528 100%);
  border: 1px solid rgba(120, 165, 255, 0.35);
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  padding: 16px;
}
.srng-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px; }
.srng-title { margin:0; font-size:1.05rem; color:#d7ecff; }
.srng-close {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #e8f2ff;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
}
.srng-grid { display:grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:12px; }
.srng-label { display:block; font-size:0.82rem; color:#b8d8ff; margin-bottom:6px; }
.srng-readonly {
  border: 1px solid rgba(255,255,255,0.16);
  border-radius:8px;
  padding:7px 10px;
  min-height: 36px;
  background: rgba(255,255,255,0.05);
  color:#e9f5ff;
}
.srng-actions { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.srng-btn {
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  color: #eaf3ff;
  background: rgba(88,120,180,0.25);
  cursor: pointer;
}
.srng-btn.srng-generate { background: linear-gradient(135deg, #f39c7a, #7dbdff); color: #fff; border: none; }
.srng-btn.srng-copy { background: linear-gradient(135deg, #28c76f, #1ba083); color: #fff; border: none; }
.srng-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.srng-status { margin-bottom:10px; font-size:0.85rem; color:#9dc7ff; min-height:1.1em; }
.srng-pedagogy { border:1px solid rgba(255,255,255,0.14); border-radius:10px; background: rgba(10, 24, 48, 0.72); padding:10px; margin-bottom:12px; display:none; }
.srng-pedagogy-title { margin:0 0 8px 0; font-size:0.86rem; color:#bcd9ff; font-weight:600; }
.srng-pedagogy-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.srng-pedagogy-item label { display:flex; justify-content:space-between; font-size:0.78rem; color:#b8d8ff; margin-bottom:6px; }
.srng-pedagogy-item input[type="range"] { width:100%; accent-color:#7dbdff; }
.srng-analytics { display:grid; grid-template-columns:1.4fr 1fr; gap:10px; margin-bottom:12px; }
.srng-card { border: 1px solid rgba(255,255,255,0.14); border-radius:10px; background: rgba(10, 24, 48, 0.72); padding:10px; }
.srng-mini-title { margin:0 0 8px 0; font-size:0.86rem; color:#bcd9ff; font-weight:600; }
.srng-hist { height:145px; }
.srng-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.srng-chip { border:1px solid rgba(155,191,255,0.28); background: rgba(71,111,178,0.15); border-radius:8px; padding:8px; }
.srng-chip-label { font-size:0.72rem; color:#9fc2ef; margin-bottom:3px; }
.srng-chip-value { font-size:0.95rem; color:#edf6ff; font-weight:600; }
.srng-table-wrap { border:1px solid rgba(255,255,255,0.14); border-radius:10px; overflow:auto; max-height: 33vh; }
.srng-table { width:100%; border-collapse: collapse; font-size: 0.9rem; }
.srng-table th, .srng-table td { padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:left; }
.srng-table th { position: sticky; top: 0; background:#112446; color:#cfe6ff; z-index: 1; }
@media (max-width: 760px) {
  .srng-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .srng-pedagogy-grid { grid-template-columns:1fr; }
  .srng-analytics { grid-template-columns:1fr; }
}
`;
    document.head.appendChild(style);
  }

  function createComponentMarkup() {
    const modal = document.createElement("div");
    modal.id = COMPONENT_ID;
    modal.className = "srng-modal";
    modal.innerHTML = `
      <div class="srng-panel">
        <div class="srng-top">
          <h3 class="srng-title"><i class="fas fa-dice"></i> Random Samples</h3>
          <button class="srng-close" type="button" data-srng-close><i class="fas fa-times"></i></button>
        </div>
        <div class="srng-grid">
          <div><span class="srng-label">Distribution</span><div class="srng-readonly" id="srngDistName">-</div></div>
          <div><span class="srng-label">Parameters</span><div class="srng-readonly" id="srngParamText">-</div></div>
          <div>
            <label class="srng-label" for="srngSampleSize">Sample Size (n)</label>
            <input id="srngSampleSize" class="input-field" type="number" min="1" max="5000" step="1" value="30"/>
          </div>
          <div>
            <label class="srng-label" for="srngDecimals">Decimals</label>
            <input id="srngDecimals" class="input-field" type="number" min="0" max="10" step="1" value="4"/>
          </div>
        </div>
        <div class="srng-actions">
          <button class="srng-btn srng-generate" type="button" id="srngGenerateBtn"><i class="fas fa-bolt"></i> Generate</button>
          <button class="srng-btn srng-copy" type="button" id="srngCopyBtn" disabled><i class="fas fa-copy"></i> Copy Numbers</button>
        </div>
        <div class="srng-pedagogy" id="srngPedagogy">
          <h4 class="srng-pedagogy-title">Interactive Pedagogic Sliders</h4>
          <div class="srng-pedagogy-grid">
            <div class="srng-pedagogy-item">
              <label>Mean (mu) <span id="srngMeanValue">0.00</span></label>
              <input id="srngMeanSlider" type="range" min="-10" max="10" step="0.1" value="0"/>
            </div>
            <div class="srng-pedagogy-item">
              <label>Std Dev (sigma) <span id="srngStdValue">1.00</span></label>
              <input id="srngStdSlider" type="range" min="0.1" max="5" step="0.1" value="1"/>
            </div>
            <div class="srng-pedagogy-item">
              <label>Sample Size (n) <span id="srngNValue">30</span></label>
              <input id="srngNSlider" type="range" min="5" max="300" step="1" value="30"/>
            </div>
          </div>
        </div>
        <div class="srng-status" id="srngStatus">Set sample size, then click Generate.</div>
        <div class="srng-analytics">
          <div class="srng-card">
            <h4 class="srng-mini-title">Sample Histogram</h4>
            <div class="srng-hist" id="srngHistogram"></div>
          </div>
          <div class="srng-card">
            <h4 class="srng-mini-title">Basic Sample Stats</h4>
            <div class="srng-stats">
              <div class="srng-chip"><div class="srng-chip-label">Mean</div><div class="srng-chip-value" id="srngStatMean">-</div></div>
              <div class="srng-chip"><div class="srng-chip-label">Std Dev</div><div class="srng-chip-value" id="srngStatStd">-</div></div>
              <div class="srng-chip"><div class="srng-chip-label">Min</div><div class="srng-chip-value" id="srngStatMin">-</div></div>
              <div class="srng-chip"><div class="srng-chip-label">Max</div><div class="srng-chip-value" id="srngStatMax">-</div></div>
            </div>
          </div>
        </div>
        <div class="srng-table-wrap">
          <table class="srng-table">
            <thead><tr><th>#</th><th>Sample Value</th></tr></thead>
            <tbody id="srngTableBody"><tr><td colspan="2" style="color:#9fb5cc;">No samples generated yet.</td></tr></tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function formatParamText(params, decimals) {
    return Object.entries(params)
      .map(([k, v]) => `${k}=${Number.isFinite(v) ? Number(v).toFixed(decimals) : v}`)
      .join(", ");
  }

  function renderTable(values, decimals) {
    const tbody = document.getElementById("srngTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!values.length) {
      tbody.innerHTML = '<tr><td colspan="2" style="color:#9fb5cc;">No samples generated yet.</td></tr>';
      return;
    }
    const displayedRows = values.slice(0, 8);
    const frag = document.createDocumentFragment();
    displayedRows.forEach((v, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${idx + 1}</td><td>${v.toFixed(decimals)}</td>`;
      frag.appendChild(tr);
    });
    if (values.length > displayedRows.length) {
      const moreTr = document.createElement("tr");
      moreTr.innerHTML = `<td colspan="2" style="color:#9fb5cc;">Showing first 8 rows of ${values.length} generated values.</td>`;
      frag.appendChild(moreTr);
    }
    tbody.appendChild(frag);
  }

  function renderStats(values, decimals) {
    if (!values.length) return;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, n - 1);
    const std = Math.sqrt(Math.max(0, variance));
    const min = Math.min(...values);
    const max = Math.max(...values);
    document.getElementById("srngStatMean").textContent = mean.toFixed(decimals);
    document.getElementById("srngStatStd").textContent = std.toFixed(decimals);
    document.getElementById("srngStatMin").textContent = min.toFixed(decimals);
    document.getElementById("srngStatMax").textContent = max.toFixed(decimals);
  }

  let srngHistogram = null;
  function renderHistogram(values, previousValues = []) {
    const containerId = "srngHistogram";
    if (!values.length || typeof window.Highcharts === "undefined") return;
    const allValues = previousValues.length ? values.concat(previousValues) : values;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const binsCount = Math.max(8, Math.min(24, Math.round(Math.sqrt(values.length))));
    const span = Math.max(1e-9, max - min);
    const width = span / binsCount;
    const bins = Array.from({ length: binsCount }, (_, i) => ({ start: min + i * width, end: min + (i + 1) * width, count: 0, prevCount: 0 }));

    values.forEach((v) => {
      let idx = Math.floor((v - min) / width);
      idx = Math.max(0, Math.min(binsCount - 1, idx));
      bins[idx].count += 1;
    });

    previousValues.forEach((v) => {
      let idx = Math.floor((v - min) / width);
      idx = Math.max(0, Math.min(binsCount - 1, idx));
      bins[idx].prevCount += 1;
    });

    const points = bins.map((b) => ({
      y: b.count,
      custom: { start: b.start, end: b.end },
    }));
    const prevPoints = bins.map((b) => ({
      y: b.prevCount,
      custom: { start: b.start, end: b.end },
    }));

    if (srngHistogram) srngHistogram.destroy();
    srngHistogram = window.Highcharts.chart(containerId, {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        margin: [8, 8, 12, 28],
        spacingBottom: 0,
      },
      title: { text: null },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: {
        enabled: true,
        align: "right",
        verticalAlign: "top",
        y: 0,
        itemStyle: { color: "#cfe0f5", fontSize: "10px", fontWeight: "600" },
        itemHoverStyle: { color: "#e6f0ff" },
      },
      xAxis: {
        labels: { enabled: false },
        lineColor: "rgba(255,255,255,0.2)",
        tickColor: "rgba(255,255,255,0.2)",
      },
      yAxis: {
        title: { text: null },
        min: 0,
        minPadding: 0,
        maxPadding: 0.02,
        endOnTick: false,
        labels: { style: { color: "#b7ccdf", fontSize: "10px" } },
        gridLineColor: "rgba(255,255,255,0.08)",
      },
      tooltip: {
        shared: true,
        backgroundColor: "rgba(6, 12, 24, 0.92)",
        style: { color: "#e7f2ff" },
        formatter: function () {
          const pointsForBin = this.points || [];
          const samplePoint = pointsForBin[0];
          const start = samplePoint?.point?.custom?.start;
          const end = samplePoint?.point?.custom?.end;
          let html = `<b>Range:</b> ${Number(start).toFixed(3)} to ${Number(end).toFixed(3)}`;
          pointsForBin.forEach((p) => {
            html += `<br/><span style="color:${p.color}">${p.series.name}:</span> ${p.y}`;
          });
          return html;
        },
      },
      plotOptions: { column: { borderWidth: 0, pointPadding: 0.05, groupPadding: 0.06, grouping: false } },
      series: [
        { name: "Current", data: points, color: "rgba(124, 183, 255, 0.86)", pointWidth: 22, zIndex: 2 },
        ...(previousValues.length
          ? [{
              name: "Previous overlay",
              data: prevPoints,
              color: "rgba(216, 234, 255, 0.32)",
              borderColor: "rgba(216, 234, 255, 0.45)",
              borderWidth: 1,
              pointWidth: 14,
              zIndex: 3,
            }]
          : []),
      ],
    });
  }

  function copyNumbersOnly(values, decimals, setStatus) {
    const payload = values.map((v) => v.toFixed(decimals)).join("\n");
    if (!payload) {
      setStatus("Nothing to copy yet. Generate samples first.");
      return;
    }
    navigator.clipboard
      .writeText(payload)
      .then(() => setStatus(`Copied ${values.length} numbers to clipboard.`))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = payload;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        setStatus(`Copied ${values.length} numbers to clipboard.`);
      });
  }

  function installComponent() {
    if (document.getElementById(COMPONENT_ID)) return;
    if (document.querySelector(".random-generator-trigger")) return;

    const config = distConfigFromPath();
    if (!config) return;

    injectStyles();

    const aboutBtn =
      document.querySelector(".control-block-about button") ||
      document.querySelector("button[onclick*=\"openAboutModal\"]") ||
      document.querySelector(".about-btn");
    const aboutContainer = aboutBtn ? aboutBtn.closest(".control-block-about") || aboutBtn.parentElement : null;
    const insertionParent =
      (aboutContainer && aboutContainer.parentElement) ||
      document.querySelector(".control-panel-sections") ||
      document.querySelector(".control-panel");
    if (!insertionParent) return;

    const triggerWrap = document.createElement("div");
    triggerWrap.className = "srng-button-wrap";
    triggerWrap.innerHTML =
      '<button type="button" class="srng-trigger"><i class="fas fa-dice"></i> Generate Random Numbers</button>';

    if (aboutContainer && aboutContainer.parentElement === insertionParent) {
      insertionParent.insertBefore(triggerWrap, aboutContainer);
    } else {
      insertionParent.appendChild(triggerWrap);
    }

    const modal = createComponentMarkup();
    const closeModal = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    };
    const openModal = () => {
      const params = config.getParams();
      const decimals = Math.max(0, Math.min(10, parseInt(document.getElementById("precision")?.value || "3", 10)));
      document.getElementById("srngDistName").textContent = config.name;
      document.getElementById("srngParamText").textContent = formatParamText(params, decimals);
      document.getElementById("srngDecimals").value = String(decimals);
      document.getElementById("srngStatus").textContent = "Set sample size, then click Generate.";
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    };

    triggerWrap.querySelector("button").addEventListener("click", openModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-srng-close]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("active")) closeModal();
    });

    const generateBtn = document.getElementById("srngGenerateBtn");
    const copyBtn = document.getElementById("srngCopyBtn");
    const statusEl = document.getElementById("srngStatus");
    const pedagogyPanel = document.getElementById("srngPedagogy");
    const meanSlider = document.getElementById("srngMeanSlider");
    const stdSlider = document.getElementById("srngStdSlider");
    const nSlider = document.getElementById("srngNSlider");
    const isNormal = config.name === "Normal Distribution";
    const setStatus = (msg) => {
      statusEl.textContent = msg;
    };

    function syncPedagogyValues() {
      if (!isNormal) return;
      const mean = parseFloat(meanSlider.value) || 0;
      const std = parseFloat(stdSlider.value) || 1;
      const n = parseInt(nSlider.value, 10) || 30;
      const meanValue = document.getElementById("srngMeanValue");
      const stdValue = document.getElementById("srngStdValue");
      const nValue = document.getElementById("srngNValue");
      if (meanValue) meanValue.textContent = mean.toFixed(2);
      if (stdValue) stdValue.textContent = std.toFixed(2);
      if (nValue) nValue.textContent = String(n);
      document.getElementById("srngSampleSize").value = String(n);
      document.getElementById("srngParamText").textContent = `mean=${mean.toFixed(3)}, stddev=${std.toFixed(3)}`;
    }

    function getActiveParams() {
      if (!isNormal) return config.getParams();
      return {
        mean: parseFloat(meanSlider.value) || 0,
        stddev: parseFloat(stdSlider.value) || 1,
      };
    }

    function runGeneration(isInteractive = false) {
      if (config.requiresJstat) {
        setStatus(config.jstatMissingMessage || "Required math library is missing.");
        return;
      }
      const params = getActiveParams();
      if (!config.validate(params)) {
        setStatus("Invalid distribution parameters. Please correct inputs and retry.");
        return;
      }
      const nRaw = parseInt(document.getElementById("srngSampleSize").value, 10);
      const decimalsRaw = parseInt(document.getElementById("srngDecimals").value, 10);
      const n = Math.max(1, Math.min(5000, Number.isFinite(nRaw) ? nRaw : 30));
      const decimals = Math.max(0, Math.min(10, Number.isFinite(decimalsRaw) ? decimalsRaw : 4));

      if (isInteractive && latestValues.length) {
        previousValues = [...latestValues];
      } else if (!isInteractive) {
        previousValues = [];
      }

      latestValues = [];
      for (let i = 0; i < n; i += 1) {
        const value = config.sampleOne(params);
        if (Number.isFinite(value)) latestValues.push(value);
      }

      renderTable(latestValues, decimals);
      renderStats(latestValues, decimals);
      renderHistogram(latestValues, previousValues);
      copyBtn.disabled = latestValues.length === 0;
      const shown = Math.min(8, latestValues.length);
      setStatus(`${isInteractive ? "Interactive update" : "Generated"} ${latestValues.length} samples from ${config.name}. Showing ${shown} rows.`);
    }

    let latestValues = [];
    let previousValues = [];
    generateBtn.addEventListener("click", () => runGeneration(false));

    if (isNormal) {
      pedagogyPanel.style.display = "block";
      [meanSlider, stdSlider, nSlider].forEach((slider) => {
        slider.addEventListener("input", () => {
          syncPedagogyValues();
          runGeneration(true);
        });
      });
      const sampleSizeInput = document.getElementById("srngSampleSize");
      sampleSizeInput.addEventListener("input", () => {
        const parsed = parseInt(sampleSizeInput.value, 10);
        if (Number.isFinite(parsed)) nSlider.value = String(Math.max(5, Math.min(300, parsed)));
        syncPedagogyValues();
      });
    } else {
      pedagogyPanel.style.display = "none";
    }

    copyBtn.addEventListener("click", () => {
      const decimalsRaw = parseInt(document.getElementById("srngDecimals").value, 10);
      const decimals = Math.max(0, Math.min(10, Number.isFinite(decimalsRaw) ? decimalsRaw : 4));
      copyNumbersOnly(latestValues, decimals, setStatus);
    });

    const originalOpenModal = openModal;
    triggerWrap.querySelector("button").removeEventListener("click", openModal);
    triggerWrap.querySelector("button").addEventListener("click", () => {
      originalOpenModal();
      if (isNormal) {
        const p = config.getParams();
        meanSlider.min = String((Number.isFinite(p.mean) ? p.mean : 0) - 10);
        meanSlider.max = String((Number.isFinite(p.mean) ? p.mean : 0) + 10);
        meanSlider.value = String(Number.isFinite(p.mean) ? p.mean : 0);
        stdSlider.max = String(Math.max(5, (Number.isFinite(p.stddev) ? p.stddev : 1) * 3));
        stdSlider.value = String(Number.isFinite(p.stddev) ? p.stddev : 1);
        nSlider.value = document.getElementById("srngSampleSize").value || "30";
        syncPedagogyValues();
        runGeneration(true);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installComponent);
  } else {
    installComponent();
  }
})();

#!/usr/bin/env python3
"""Inject case-study bootstrap scripts into analytics results pages."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
MARKER = "/* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */"

BOOTSTRAPS = {
    "independent/independent-results.html": """
  <script>
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle('Treatment vs Control — Independent Means');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'independent-demo-worker.html';
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'INDEPENDENT_CASE_STUDY_BUNDLE') {
            if (data.rawData) {
              window.independentRangeData = data.rawData;
              window.independentAnalysisRows = data.rawData;
            }
            if (typeof populateBundle === 'function') populateBundle(data.payload || {});
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'INDEPENDENT_CASE_STUDY_ERROR') {
            console.error('Independent case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
  </script>
""",
    "dependent/dependent-results.html": """
  <script>
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle('Before–After Intervention — Paired Means');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'dependent-demo-worker.html';
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'DEPENDENT_CASE_STUDY_BUNDLE') {
            if (data.rawData) {
              window.dependentRangeData = data.rawData;
              window.dependentAnalysisRows = data.rawData;
            }
            if (typeof populateBundle === 'function') populateBundle(data.payload || {});
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'DEPENDENT_CASE_STUDY_ERROR') {
            console.error('Dependent case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
  </script>
""",
    "anova/anova-results.html": """
  <script>
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle('Dose Groups — One-Way ANOVA');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'anova-demo-worker.html';
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'ANOVA_CASE_STUDY_BUNDLE') {
            window._bundle = data.payload;
            if (typeof populateAll === 'function') populateAll(data.payload || {});
            if (data.rawData && typeof populateViewData === 'function') {
              try { populateViewData(data.rawData); } catch (_e) {}
            }
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'ANOVA_CASE_STUDY_ERROR') {
            console.error('ANOVA case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
  </script>
""",
    "pca/pca-analysis.html": """
  <script>
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle('Product Attributes — PCA');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'pca-demo-worker.html';
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'PCA_CASE_STUDY_BUNDLE') {
            if (typeof window.populatePcaBundle === 'function') window.populatePcaBundle(data.payload || {});
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'PCA_CASE_STUDY_ERROR') {
            console.error('PCA case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
  </script>
""",
    "cluster/cluster-analysis.html": """
  <script>
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        var locked = params.get('lockedMethod') === 'hierarchical' ? 'hierarchical' : 'kmeans';
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle(locked === 'hierarchical'
              ? 'Customer Taxonomy — Hierarchical Clustering'
              : 'Customer Segments — K-Means Clustering');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'cluster-demo-worker.html?lockedMethod=' + encodeURIComponent(locked);
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'CLUSTER_CASE_STUDY_BUNDLE') {
            if (typeof populateClusterBundle === 'function') populateClusterBundle(data.payload || {});
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'CLUSTER_CASE_STUDY_ERROR') {
            console.error('Cluster case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
  </script>
""",
}

# Injected INSIDE the main script (before its closing </script>) so let-scoped state is visible.
INLINE_BOOTSTRAPS = {
    "regression/regression-coefficients.html": """
    (function () {
      /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
      var params = new URLSearchParams(window.location.search);
      if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
      function boot() {
        document.body.classList.add('demo-embed');
        try {
          if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
            StatisticoHeader.updateTitle('Sales Drivers — Linear Regression');
          }
        } catch (_e) {}
        var worker = document.createElement('iframe');
        worker.src = 'regression-demo-worker.html';
        worker.style.display = 'none';
        worker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(worker);
        window.addEventListener('message', function (event) {
          var data = event.data;
          if (!data) return;
          if (data.type === 'REGRESSION_CASE_STUDY_BUNDLE' && data.payload) {
            receivedRegressionData = data.payload;
            receivedModelSpec = data.payload.modelSpec;
            window.regressionModelSpec = receivedModelSpec;
            window.regressionAddress = data.payload.address || 'Case Study Data';
            processRegressionData();
            if (worker.parentNode) worker.parentNode.removeChild(worker);
          } else if (data.type === 'REGRESSION_CASE_STUDY_ERROR') {
            console.error('Regression case study failed:', data.error);
          }
        });
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    })();
""",
    "mixed/mixed-results.html": """
  (function () {
    /* __STATISTICO_CASE_STUDY_BOOTSTRAP__ */
    var params = new URLSearchParams(window.location.search);
    if (params.get('embed') !== '1' || params.get('demo') !== '1') return;
    function boot() {
      document.body.classList.add('demo-embed');
      try {
        if (typeof StatisticoHeader !== 'undefined' && StatisticoHeader.updateTitle) {
          StatisticoHeader.updateTitle('Clinic Visits — Mixed Model');
        }
      } catch (_e) {}
      var worker = document.createElement('iframe');
      worker.src = 'mixed-demo-worker.html';
      worker.style.display = 'none';
      worker.setAttribute('aria-hidden', 'true');
      document.body.appendChild(worker);
      window.addEventListener('message', function (event) {
        var data = event.data;
        if (!data) return;
        if (data.type === 'MIXED_CASE_STUDY_BUNDLE' && data.payload) {
          try {
            var p2 = data.payload;
            var headers = p2.headers || [];
            var rows = p2.rows || [];
            var spec = p2.modelSpec || {};
            _modelSpec = spec;
            _sourceHeaders = headers.slice();
            _sourceRows = rows.slice();
            var results = computeMixedModel(headers, rows, spec);
            receiveMixedModelResults(results);
            if (typeof wirePostResultsData === 'function') setTimeout(function () { wirePostResultsData(results); }, 400);
          } catch (e) {
            console.error('Mixed case study compute failed:', e);
          }
          if (worker.parentNode) worker.parentNode.removeChild(worker);
        } else if (data.type === 'MIXED_CASE_STUDY_ERROR') {
          console.error('Mixed case study failed:', data.error);
        }
      });
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
    else document.addEventListener('DOMContentLoaded', boot);
  })();
""",
}


def inject_before_body(path: Path, snippet: str) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        start = text.find(MARKER)
        script_start = text.rfind("<script>", 0, start)
        script_end = text.find("</script>", start)
        if script_start >= 0 and script_end >= 0:
            text = text[:script_start] + snippet.strip() + "\n" + text[script_end + len("</script>"):]
        else:
            text = text.replace("</body>", snippet + "\n</body>", 1)
    else:
        if "</body>" not in text:
            raise SystemExit(f"no </body> in {path}")
        text = text.replace("</body>", snippet + "\n</body>", 1)
    path.write_text(text, encoding="utf-8")
    print("injected", path.relative_to(ROOT))


def inject_inline(path: Path, snippet: str) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        print("skip (already present)", path.relative_to(ROOT))
        return
    idx = text.rfind("</script>")
    if idx < 0:
        raise SystemExit(f"no </script> in {path}")
    text = text[:idx] + snippet + "\n" + text[idx:]
    path.write_text(text, encoding="utf-8")
    print("injected-inline", path.relative_to(ROOT))


def main() -> None:
    for rel, snippet in BOOTSTRAPS.items():
        inject_before_body(ROOT / rel, snippet)
    for rel, snippet in INLINE_BOOTSTRAPS.items():
        inject_inline(ROOT / rel, snippet)


if __name__ == "__main__":
    main()

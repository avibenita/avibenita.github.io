#!/usr/bin/env python3
"""Generate case-study demo-worker HTML pages for analytics modules."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent

RNG = """
        let seed = {seed};
        function rnd() {{
          seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
          return (seed >>> 0) / 0xFFFFFFFF;
        }}
        function normal(mean, sd) {{
          const u1 = Math.max(1e-10, rnd()), u2 = rnd();
          return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }}
"""

WORKERS = [
    {
        "path": "independent/independent-demo-worker.html",
        "title": "Independent Means case study data",
        "script": "../../../taskpane/independent/independent-input-panel.js",
        "msg": "INDEPENDENT_CASE_STUDY_BUNDLE",
        "err": "INDEPENDENT_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260807)}
        const headers = ['Control Score', 'Treatment Score'];
        const n = 40;
        const rows = [];
        for (let i = 0; i < n; i++) {{
          rows.push([
            Math.round(normal(68, 10) * 10) / 10,
            Math.round(normal(74, 11) * 10) / 10
          ]);
        }}
        return {{
          headers, rows,
          modelSpec: {{
            compareMode: 'two-vars',
            selectedColumns: headers.slice(),
            primaryFramework: 'parametric',
            primaryTest: 'welch'
          }},
          meta: {{
            title: 'Treatment vs Control — Independent Means',
            story: 'Does a new coaching program raise assessment scores versus a control group?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          const bundle = buildIndependentBundle(demo.headers, demo.rows, demo.modelSpec);
          const rawData = [demo.headers].concat(demo.rows);
          window.parent.postMessage({{
            type: 'INDEPENDENT_CASE_STUDY_BUNDLE',
            payload: bundle,
            rawData: rawData,
            meta: demo.meta
          }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'INDEPENDENT_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "dependent/dependent-demo-worker.html",
        "title": "Paired Means case study data",
        "script": "../../../taskpane/dependent/dependent-input-panel.js",
        "msg": "DEPENDENT_CASE_STUDY_BUNDLE",
        "err": "DEPENDENT_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260808)}
        const headers = ['Pre Score', 'Post Score'];
        const n = 36;
        const rows = [];
        for (let i = 0; i < n; i++) {{
          const pre = Math.round(normal(62, 9) * 10) / 10;
          const gain = normal(6.5, 4.2);
          rows.push([pre, Math.round((pre + gain) * 10) / 10]);
        }}
        return {{
          headers, rows,
          modelSpec: {{
            compareMode: 'two-vars',
            selectedColumns: headers.slice(),
            primaryFramework: 'parametric'
          }},
          meta: {{
            title: 'Before–After Intervention — Paired Means',
            story: 'Do paired pre/post scores improve after a six-week skills workshop?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          const bundle = buildDependentBundle(demo.headers, demo.rows, demo.modelSpec);
          const rawData = [demo.headers].concat(demo.rows);
          window.parent.postMessage({{
            type: 'DEPENDENT_CASE_STUDY_BUNDLE',
            payload: bundle,
            rawData: rawData,
            meta: demo.meta
          }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'DEPENDENT_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "anova/anova-demo-worker.html",
        "title": "ANOVA case study data",
        "script": "../../../taskpane/anova/anova-input-panel.js",
        "msg": "ANOVA_CASE_STUDY_BUNDLE",
        "err": "ANOVA_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260809)}
        const headers = ['Outcome', 'Dose Group'];
        const groups = ['Placebo', 'Low', 'High'];
        const means = [52, 58, 66];
        const rows = [];
        groups.forEach((g, gi) => {{
          for (let i = 0; i < 28; i++) {{
            rows.push([Math.round(normal(means[gi], 8) * 10) / 10, g]);
          }}
        }});
        return {{
          headers, rows,
          modelSpec: {{
            type: 'one-way',
            dv: 'Outcome',
            factor1: 'Dose Group',
            alpha: 0.05,
            posthocMethod: 'tukey'
          }},
          meta: {{
            title: 'Dose Groups — One-Way ANOVA',
            story: 'Do mean outcomes differ across placebo, low-dose, and high-dose groups?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          const bundle = buildAnovaBundle(demo.headers, demo.rows, demo.modelSpec);
          window.parent.postMessage({{
            type: 'ANOVA_CASE_STUDY_BUNDLE',
            payload: bundle,
            rawData: {{ headers: demo.headers, rows: demo.rows }},
            meta: demo.meta
          }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'ANOVA_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "pca/pca-demo-worker.html",
        "title": "PCA case study data",
        "script": "../../../taskpane/pca/pca-input-panel.js",
        "msg": "PCA_CASE_STUDY_BUNDLE",
        "err": "PCA_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260810)}
        const headers = ['Price', 'Quality', 'Durability', 'Design', 'Support', 'Features'];
        const n = 160;
        const rows = [];
        for (let i = 0; i < n; i++) {{
          const value = normal(0, 1);
          const aesthetics = normal(0, 1);
          const service = normal(0, 1);
          rows.push([
            Math.round((55 + value * 8 + normal(0, 3)) * 10) / 10,
            Math.round((70 + value * 10 + aesthetics * 3 + normal(0, 4)) * 10) / 10,
            Math.round((68 + value * 9 + normal(0, 4)) * 10) / 10,
            Math.round((62 + aesthetics * 11 + normal(0, 4)) * 10) / 10,
            Math.round((64 + service * 10 + normal(0, 4)) * 10) / 10,
            Math.round((66 + value * 6 + aesthetics * 4 + normal(0, 4)) * 10) / 10
          ]);
        }}
        return {{
          headers, rows,
          modelSpec: {{ variables: headers.slice() }},
          meta: {{
            title: 'Product Attributes — PCA',
            story: 'Can six product ratings be reduced to a smaller set of components that explain most of the variation?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          const bundle = buildPcaBundle(demo.headers, demo.rows, demo.modelSpec);
          bundle.dataContext = {{ headers: demo.headers, rows: demo.rows, address: 'Case Study Data', modelSpec: demo.modelSpec }};
          window.parent.postMessage({{ type: 'PCA_CASE_STUDY_BUNDLE', payload: bundle, meta: demo.meta }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'PCA_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "cluster/cluster-demo-worker.html",
        "title": "Clustering case study data",
        "script": "../../../taskpane/cluster/cluster-input-panel.js",
        "msg": "CLUSTER_CASE_STUDY_BUNDLE",
        "err": "CLUSTER_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260811)}
        const params = new URLSearchParams(window.location.search);
        const locked = params.get('lockedMethod') === 'hierarchical' ? 'hierarchical' : 'kmeans';
        window.CLUSTER_LOCKED_METHOD = locked;
        const headers = ['Recency', 'Frequency', 'Monetary', 'Tenure'];
        const centers = [
          [12, 18, 420, 36],
          [45, 6, 120, 14],
          [25, 11, 260, 24]
        ];
        const rows = [];
        centers.forEach((c) => {{
          for (let i = 0; i < 40; i++) {{
            rows.push([
              Math.max(1, Math.round(normal(c[0], 6))),
              Math.max(1, Math.round(normal(c[1], 3))),
              Math.max(20, Math.round(normal(c[2], 55))),
              Math.max(3, Math.round(normal(c[3], 7)))
            ]);
          }}
        }});
        return {{
          headers, rows, locked,
          modelSpec: {{
            variables: headers.slice(),
            k: 3,
            standardize: true,
            clusterMethod: locked,
            distance: 'euclidean',
            linkage: 'average'
          }},
          meta: {{
            title: locked === 'hierarchical'
              ? 'Customer Taxonomy — Hierarchical Clustering'
              : 'Customer Segments — K-Means Clustering',
            story: 'Do RFM-style customer metrics form distinct segments?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          const bundle = buildClusterBundle(demo.headers, demo.rows, demo.modelSpec);
          bundle.dataContext = {{ headers: demo.headers, rows: demo.rows, address: 'Case Study Data', modelSpec: demo.modelSpec }};
          window.parent.postMessage({{ type: 'CLUSTER_CASE_STUDY_BUNDLE', payload: bundle, meta: demo.meta }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'CLUSTER_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "regression/regression-demo-worker.html",
        "title": "Linear Regression case study data",
        "script": "",  # computation happens in results page
        "msg": "REGRESSION_CASE_STUDY_BUNDLE",
        "err": "REGRESSION_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260812)}
        const headers = ['Sales', 'Ad Spend', 'Store Size', 'Region'];
        const regions = ['North', 'South', 'West'];
        const rows = [];
        for (let i = 0; i < 120; i++) {{
          const ad = Math.max(5, normal(40, 15));
          const size = Math.max(800, normal(2200, 500));
          const region = regions[Math.floor(rnd() * regions.length)];
          const regionEffect = region === 'North' ? 8 : (region === 'South' ? 0 : 4);
          const sales = Math.max(10, 20 + 1.8 * ad + 0.012 * size + regionEffect + normal(0, 18));
          rows.push([
            Math.round(sales * 10) / 10,
            Math.round(ad * 10) / 10,
            Math.round(size),
            region
          ]);
        }}
        return {{
          headers, rows,
          modelSpec: {{
            y: 'Sales',
            xn: ['Ad Spend', 'Store Size'],
            xc: ['Region'],
            intercept: true
          }},
          meta: {{
            title: 'Sales Drivers — Linear Regression',
            story: 'How do advertising spend, store size, and region relate to sales?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          window.parent.postMessage({{
            type: 'REGRESSION_CASE_STUDY_BUNDLE',
            payload: {{
              headers: demo.headers,
              rows: demo.rows,
              address: 'Case Study Data',
              modelSpec: demo.modelSpec
            }},
            meta: demo.meta
          }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'REGRESSION_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
    {
        "path": "mixed/mixed-demo-worker.html",
        "title": "Mixed Models case study data",
        "script": "",
        "msg": "MIXED_CASE_STUDY_BUNDLE",
        "err": "MIXED_CASE_STUDY_ERROR",
        "body": f"""
      function createData() {{
{RNG.format(seed=20260813)}
        const headers = ['Score', 'Clinic', 'Program', 'Baseline'];
        const clinics = ['Clinic A', 'Clinic B', 'Clinic C', 'Clinic D', 'Clinic E', 'Clinic F'];
        const programs = ['Standard', 'Enhanced'];
        const rows = [];
        clinics.forEach((clinic, ci) => {{
          const clinicEffect = normal(0, 4);
          for (let i = 0; i < 18; i++) {{
            const program = programs[i % 2];
            const baseline = Math.round(normal(50, 8) * 10) / 10;
            const progEffect = program === 'Enhanced' ? 6.5 : 0;
            const score = Math.round((baseline * 0.45 + 28 + progEffect + clinicEffect + normal(0, 5)) * 10) / 10;
            rows.push([score, clinic, program, baseline]);
          }}
        }});
        return {{
          headers, rows,
          modelSpec: {{
            dep: 'Score',
            fix: ['Program'],
            cov: ['Baseline'],
            rnd: 'Clinic',
            interactions: [],
            options: {{ alpha: 0.05, method: 'REML', df: 'Satterthwaite' }}
          }},
          meta: {{
            title: 'Clinic Visits — Mixed Model',
            story: 'After accounting for clinic clustering and baseline score, does an enhanced program improve outcomes?'
          }}
        }};
      }}
      function run() {{
        try {{
          const demo = createData();
          window.parent.postMessage({{
            type: 'MIXED_CASE_STUDY_BUNDLE',
            payload: {{
              headers: demo.headers,
              rows: demo.rows,
              address: 'Case Study Data',
              modelSpec: demo.modelSpec
            }},
            meta: demo.meta
          }}, '*');
        }} catch (err) {{
          window.parent.postMessage({{ type: 'MIXED_CASE_STUDY_ERROR', error: String((err && err.message) || err) }}, '*');
        }}
      }}
"""
    },
]


def render_worker(w: dict) -> str:
    script_tag = f'  <script src="{w["script"]}"></script>\n' if w["script"] else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{w["title"]}</title>
</head>
<body>
{script_tag}  <script>
    (function () {{
{w["body"]}
      if (document.readyState === 'complete') run();
      else window.addEventListener('load', run);
    }})();
  </script>
</body>
</html>
"""


def main() -> None:
    for w in WORKERS:
        path = ROOT / w["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render_worker(w), encoding="utf-8")
        print("wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    main()

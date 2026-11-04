"""Reproducible Independent Means film fixture. Seed 110401."""
import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

rng = np.random.default_rng(110401)


def sample(n, mean, sd):
    z = rng.normal(size=n)
    return np.round(mean + sd * (z - z.mean()) / z.std(ddof=1), 6)


a = sample(30, 65, 10)
b = sample(30, 71, 10)
rows = []
for i, v in enumerate(a, 1):
    rows.append([f"A{i:02d}", float(v), ""])
for i, v in enumerate(b, 1):
    rows.append([f"B{i:02d}", "", float(v)])

n1 = n2 = 30
m1 = float(np.mean(a))
m2 = float(np.mean(b))
v1 = float(np.var(a, ddof=1))
v2 = float(np.var(b, ddof=1))
se = math.sqrt(v1 / n1 + v2 / n2)
diff = m1 - m2
t = diff / se
df_num = (v1 / n1 + v2 / n2) ** 2
df_den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1)
df = df_num / df_den
p_normal = 2 * (1 - stats.norm.cdf(abs(t)))
zcrit = 1.959964
sp = math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
d = diff / sp
g = d * (1 - 3 / (4 * (n1 + n2) - 9))
sci = stats.ttest_ind(a, b, equal_var=False)
tcrit = float(stats.t.ppf(0.975, df))

root = Path(__file__).resolve().parent
fixture = {
    "title": "Simulated independent groups: performance score.",
    "headers": ["participant_id", "Group A", "Group B"],
    "rows": rows,
    "spec": {
        "compareMode": "two-vars",
        "selectedColumns": ["Group A", "Group B"],
        "groupA": "Group A",
        "groupB": "Group B",
        "primaryFramework": "parametric",
        "primaryTest": "welch",
        "hypothesis": "two-sided",
        "confidence": 0.95,
    },
}
reference = {
    "n1": n1,
    "n2": n2,
    "mean1": m1,
    "mean2": m2,
    "sd1": math.sqrt(v1),
    "sd2": math.sqrt(v2),
    "diff_A_minus_B": diff,
    "welch_t": t,
    "welch_df": df,
    "p_normal": p_normal,
    "ci95_normal": [diff - zcrit * se, diff + zcrit * se],
    "cohens_d_pooled": d,
    "hedges_g": g,
    "scipy_welch_t": float(sci.statistic),
    "scipy_welch_p": float(sci.pvalue),
    "scipy_welch_ci95": [diff - tcrit * se, diff + tcrit * se],
}
(root / "fixtures.json").write_text(json.dumps(fixture), encoding="utf-8")
(root / "reference.json").write_text(json.dumps(reference, indent=2), encoding="utf-8")
print(json.dumps(reference, indent=2))

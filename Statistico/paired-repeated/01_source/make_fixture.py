"""Reproducible Paired / Repeated Means fixture. Seed 110402."""
import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

rng = np.random.default_rng(110402)


def sample(n, mean, sd):
    z = rng.normal(size=n)
    return np.round(mean + sd * (z - z.mean()) / z.std(ddof=1), 6)


before = sample(24, 60, 12)
change = sample(24, 4, 8)
after = np.round(before + change, 6)
followup = np.round(before + sample(24, 7, 9), 6)

rows = []
for i in range(24):
    rows.append([f"P{i + 1:02d}", float(before[i]), float(after[i]), float(followup[i])])

diff = after - before
tt = stats.ttest_rel(after, before)
se = float(diff.std(ddof=1) / math.sqrt(24))
half = float(stats.t.ppf(0.975, 23) * se)
ci = [float(diff.mean() - half), float(diff.mean() + half)]

Y = np.column_stack([before, after, followup])
n, k = Y.shape
grand = float(Y.mean())
means = Y.mean(axis=0)
subj = Y.mean(axis=1)
ss_time = float(n * np.sum((means - grand) ** 2))
ss_subjects = float(k * np.sum((subj - grand) ** 2))
ss_error = float(np.sum((Y - means - subj[:, None] + grand) ** 2))
df1, df2 = k - 1, (n - 1) * (k - 1)
f_stat = (ss_time / df1) / (ss_error / df2)
partial_eta = ss_time / (ss_time + ss_error)

reference = {
    "nPairs": 24,
    "meanChange": float(diff.mean()),
    "sdChange": float(diff.std(ddof=1)),
    "negativeChanges": int(np.sum(diff < 0)),
    "t": float(tt.statistic),
    "df": 23,
    "p": float(tt.pvalue),
    "ciLow": ci[0],
    "ciHigh": ci[1],
    "dz": float(diff.mean() / diff.std(ddof=1)),
    "occasionMeans": [float(x) for x in means],
    "rmF": float(f_stat),
    "rmDf": [df1, df2],
    "rmP": float(stats.f.sf(f_stat, df1, df2)),
    "partialEta": float(partial_eta),
    "direction": "After minus Before",
}

fixture = {
    "title": "Simulated repeated performance scores.",
    "headers": ["participant_id", "Before", "After", "Follow-up"],
    "rows": rows,
    "spec": {
        "compareMode": "two-vars",
        "selectedColumns": ["Before", "After"],
        "groupA": "After",
        "groupB": "Before",
        "groupALabel": "After",
        "groupBLabel": "Before",
        "primaryFramework": "parametric",
        "primaryTest": "paired",
        "hypothesis": "two-sided",
        "confidence": 0.95,
    },
}

root = Path(__file__).resolve().parent
(root / "fixtures.json").write_text(json.dumps(fixture, indent=2), encoding="utf-8")
(root / "reference.json").write_text(json.dumps(reference, indent=2), encoding="utf-8")
print(json.dumps(reference, indent=2))

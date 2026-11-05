"""Independent OLS reference for the Regression film. Does not import the app engine."""
import json
import sys

import numpy as np
from scipy import stats


def fit(headers, rows):
    yi = headers.index("Sales")
    ai = headers.index("Ad Spend")
    si = headers.index("Store Size")
    ri = headers.index("Region")
    categories = sorted({str(row[ri]) for row in rows})
    names = ["Intercept", "Ad Spend", "Store Size"] + [f"Region_{cat}" for cat in categories[1:]]
    x_rows = []
    y_rows = []
    for row in rows:
        y_val = float(row[yi])
        ad = float(row[ai])
        size = float(row[si])
        region = str(row[ri])
        dummies = [1.0 if region == cat else 0.0 for cat in categories[1:]]
        x_rows.append([1.0, ad, size, *dummies])
        y_rows.append(y_val)
    x = np.asarray(x_rows, dtype=float)
    y = np.asarray(y_rows, dtype=float)
    n, k = x.shape
    beta, *_ = np.linalg.lstsq(x, y, rcond=None)
    resid = y - x @ beta
    df = n - k
    sse = float(resid @ resid)
    tss = float(((y - y.mean()) ** 2).sum())
    r2 = 1 - sse / tss
    r2_adj = 1 - (1 - r2) * (n - 1) / df
    mse = sse / df
    rmse = float(np.sqrt(mse))
    xtx_inv = np.linalg.inv(x.T @ x)
    se = np.sqrt(np.diag(xtx_inv) * mse)
    t_values = beta / se
    p_values = 2 * (1 - stats.t.cdf(np.abs(t_values), df))
    t_crit = float(stats.t.ppf(0.975, df))
    ci_low = beta - t_crit * se
    ci_high = beta + t_crit * se
    ssm = tss - sse
    f_stat = (ssm / (k - 1)) / mse
    f_p = float(stats.f.sf(f_stat, k - 1, df))
    standardized = resid / np.sqrt(mse)
    flagged = [int(i + 1) for i in np.where(np.abs(standardized) > 2)[0]]
    keep = np.abs(standardized) <= 2
    x2 = x[keep]
    y2 = y[keep]
    n2, k2 = x2.shape
    beta2, *_ = np.linalg.lstsq(x2, y2, rcond=None)
    resid2 = y2 - x2 @ beta2
    df2 = n2 - k2
    sse2 = float(resid2 @ resid2)
    tss2 = float(((y2 - y2.mean()) ** 2).sum())
    r2_2 = 1 - sse2 / tss2
    r2_adj2 = 1 - (1 - r2_2) * (n2 - 1) / df2
    rmse2 = float(np.sqrt(sse2 / df2))
    shapiro_w, shapiro_p = stats.shapiro(resid)
    dw = float(np.sum(np.diff(resid) ** 2) / np.sum(resid ** 2))
    hat = np.diag(x @ xtx_inv @ x.T)
    cooks = (resid ** 2 / (k * mse)) * (hat / (1 - hat) ** 2)
    page_h = k / n
    page_cooks = (standardized ** 2) / k * (page_h / (1 - page_h) ** 2)
    return {
        "n": int(n),
        "k": int(k),
        "df": int(df),
        "categories": categories,
        "reference_category": categories[0],
        "names": names,
        "coefficients": beta.tolist(),
        "se": se.tolist(),
        "t": t_values.tolist(),
        "p": p_values.tolist(),
        "ci_low": ci_low.tolist(),
        "ci_high": ci_high.tolist(),
        "t_crit": t_crit,
        "r2": r2,
        "r2_adj": r2_adj,
        "rmse": rmse,
        "f": float(f_stat),
        "f_p": f_p,
        "flagged_rows": flagged,
        "refit": {"n": int(n2), "r2": r2_2, "r2_adj": r2_adj2, "rmse": rmse2},
        "limits": {
            "shapiro_w": float(shapiro_w),
            "shapiro_p": float(shapiro_p),
            "durbin_watson": dw,
            "max_classical_cooks": float(np.max(cooks)),
            "max_page_formula_cooks": float(np.max(page_cooks)),
            "ad_spend_index": 1,
        },
    }


def main():
    payload = json.loads(open(sys.argv[1], encoding="utf-8").read())
    print(json.dumps(fit(payload["headers"], payload["rows"])))


if __name__ == "__main__":
    main()

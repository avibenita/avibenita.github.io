import math
from typing import Any, Dict, List

import numpy as np
from scipy import stats


ENGINE_NOTICE = "Resampling and power calculations use SciPy-based engine"


def _response(payload: Dict[str, Any], status: int = 200):
    body = dict(payload or {})
    body.setdefault("engine_notice", ENGINE_NOTICE)
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }
    return body, status, headers


def _parse_array(name: str, data: Dict[str, Any]) -> np.ndarray:
    values = data.get(name, [])
    if not isinstance(values, list):
        raise ValueError(f"'{name}' must be an array of numbers.")
    parsed = []
    for v in values:
        if v is None:
            continue
        try:
            f = float(v)
        except (TypeError, ValueError):
            continue
        if math.isfinite(f):
            parsed.append(f)
    arr = np.asarray(parsed, dtype=float)
    if arr.size < 2:
        raise ValueError(f"'{name}' must contain at least 2 numeric values.")
    return arr


def _cohen_d(x: np.ndarray, y: np.ndarray) -> float:
    n1, n2 = x.size, y.size
    v1, v2 = np.var(x, ddof=1), np.var(y, ddof=1)
    pooled = (((n1 - 1) * v1) + ((n2 - 1) * v2)) / max(1, (n1 + n2 - 2))
    if pooled <= 0:
        return 0.0
    return float((np.mean(x) - np.mean(y)) / np.sqrt(pooled))


def _t_power_two_sample(alpha: float, n1: int, n2: int, effect_size_d: float, alternative: str) -> float:
    # Approximate analytical power via noncentral t distribution.
    df = max(1, n1 + n2 - 2)
    n_eff = (n1 * n2) / max(1, (n1 + n2))
    ncp = effect_size_d * np.sqrt(n_eff)
    tcrit = stats.t.ppf(1 - alpha / 2, df) if alternative == "two-sided" else stats.t.ppf(1 - alpha, df)
    nct = stats.nct(df, ncp)
    if alternative == "greater":
        power = 1.0 - nct.cdf(tcrit)
    elif alternative == "less":
        power = nct.cdf(-tcrit)
    else:
        power = (1.0 - nct.cdf(tcrit)) + nct.cdf(-tcrit)
    return float(max(0.0, min(1.0, power)))


def _bootstrap_ci_mean_diff(x: np.ndarray, y: np.ndarray, confidence_level: float, n_resamples: int, seed: int) -> List[float]:
    rng = np.random.default_rng(seed)

    def stat(a, b, axis=-1):
        return np.mean(a, axis=axis) - np.mean(b, axis=axis)

    res = stats.bootstrap(
        (x, y),
        statistic=stat,
        paired=False,
        confidence_level=confidence_level,
        n_resamples=n_resamples,
        method="percentile",
        random_state=rng,
    )
    return [float(res.confidence_interval.low), float(res.confidence_interval.high)]


def permutation_engine(request):
    if request.method == "OPTIONS":
        return _response({"ok": True}, 204)

    if request.method != "POST":
        return _response({"ok": False, "error": "Use POST with JSON body."}, 405)

    try:
        data = request.get_json(silent=True) or {}
        x = _parse_array("group_a", data)
        y = _parse_array("group_b", data)

        alternative = str(data.get("alternative", "two-sided")).strip().lower()
        if alternative not in ("two-sided", "greater", "less"):
            alternative = "two-sided"

        permutations = int(data.get("permutations", 5000))
        permutations = max(200, min(200000, permutations))
        alpha = float(data.get("alpha", 0.05))
        alpha = min(0.25, max(1e-5, alpha))
        seed = int(data.get("seed", 42))

        # Primary resampling test (difference in means).
        perm = stats.permutation_test(
            data=(x, y),
            statistic=lambda a, b, axis=-1: np.mean(a, axis=axis) - np.mean(b, axis=axis),
            permutation_type="independent",
            alternative=alternative,
            n_resamples=permutations,
            random_state=seed,
            vectorized=False,
        )

        # Reference parametric tests.
        welch = stats.ttest_ind(x, y, equal_var=False, alternative=alternative)
        student = stats.ttest_ind(x, y, equal_var=True, alternative=alternative)

        diff = float(np.mean(x) - np.mean(y))
        d = _cohen_d(x, y)
        ci = _bootstrap_ci_mean_diff(x, y, confidence_level=1 - alpha, n_resamples=min(10000, permutations), seed=seed)
        power = _t_power_two_sample(alpha=alpha, n1=x.size, n2=y.size, effect_size_d=d, alternative=alternative)

        return _response(
            {
                "ok": True,
                "input": {
                    "n_group_a": int(x.size),
                    "n_group_b": int(y.size),
                    "alternative": alternative,
                    "alpha": alpha,
                    "permutations": permutations,
                    "seed": seed,
                },
                "results": {
                    "mean_diff": diff,
                    "effect_size_cohen_d": d,
                    "bootstrap_ci_mean_diff": ci,
                    "permutation_test": {
                        "statistic": float(perm.statistic),
                        "p_value": float(perm.pvalue),
                    },
                    "welch_t": {
                        "statistic": float(welch.statistic),
                        "p_value": float(welch.pvalue),
                    },
                    "student_t": {
                        "statistic": float(student.statistic),
                        "p_value": float(student.pvalue),
                    },
                    "power_estimate": {
                        "method": "noncentral-t approximation",
                        "value": power,
                    },
                },
            },
            200,
        )
    except Exception as exc:
        return _response({"ok": False, "error": str(exc)}, 400)

"""
Logistic Regression Power Analysis — Google Cloud Function

Modes:
  epv                      — Events-per-variable (EPV) sample-size planner
  single_predictor         — Hsieh et al. (1999) normal-approximation power for one binary predictor
  multivariable_simulation — Monte Carlo power via simulated logistic regression (IRLS)
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import stats


ENGINE_NOTICE = (
    "Logistic power engine: scipy.stats.norm (single predictor), "
    "Monte Carlo IRLS (multivariable simulation)"
)

EPV_RULES = {
    "lenient": 10.0,
    "standard": 15.0,
    "conservative": 20.0,
}


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


def _clamp(v: float, lo: float, hi: float) -> float:
    return float(max(lo, min(hi, v)))


def _parse_alpha(data: Dict[str, Any]) -> float:
    return _clamp(float(data.get("alpha", 0.05)), 0.001, 0.25)


def _parse_power(data: Dict[str, Any], default: float = 0.80) -> float:
    return _clamp(float(data.get("target_power", data.get("power", default))), 0.50, 0.99)


def _interpret_power(power: float) -> str:
    if power >= 0.90:
        return "Excellent power — very likely to detect the specified effect"
    if power >= 0.80:
        return "Good power — adequate for most studies"
    if power >= 0.60:
        return "Moderate power — may miss true effects"
    if power >= 0.40:
        return "Low power — likely to miss true effects"
    return "Very low power — insufficient for reliable detection"


def _interpret_epv(epv: float, target: float) -> Tuple[str, str]:
    if epv >= target:
        return "adequate", f"Current EPV ({epv:.1f}) meets the target of {target:.0f} events per predictor."
    ratio = epv / target if target > 0 else 0.0
    if ratio >= 0.75:
        return "borderline", (
            f"EPV ({epv:.1f}) is slightly below the {target:.0f} target — consider more events or fewer predictors."
        )
    return "insufficient", (
        f"EPV ({epv:.1f}) is below the {target:.0f} target — increase events or reduce predictors before fitting."
    )


# ---------------------------------------------------------------------------
# Mode 1 — EPV planner
# ---------------------------------------------------------------------------

def _mode_epv(data: Dict[str, Any]) -> Dict[str, Any]:
    n_total = max(0, int(data.get("n_total", data.get("n", 0))))
    n_events = max(0, int(data.get("n_events", data.get("events", 0))))
    n_predictors = max(1, int(data.get("n_predictors", data.get("predictors", data.get("p", 1)))))
    target_epv = float(data.get("target_epv", EPV_RULES["standard"]))
    target_epv = _clamp(target_epv, 5.0, 50.0)

    if n_events > n_total and n_total > 0:
        raise ValueError("n_events cannot exceed n_total")

    current_epv = n_events / n_predictors if n_predictors > 0 else 0.0
    min_events = int(math.ceil(target_epv * n_predictors))
    min_total_n = None
    event_rate = None
    if n_total > 0 and n_events > 0:
        event_rate = n_events / n_total
        if event_rate > 0:
            min_total_n = int(math.ceil(min_events / event_rate))

    adequacy, interpretation = _interpret_epv(current_epv, target_epv)

    return {
        "mode": "epv",
        "n_total": n_total,
        "n_events": n_events,
        "n_predictors": n_predictors,
        "target_epv": target_epv,
        "current_epv": round(current_epv, 2),
        "min_events_recommended": min_events,
        "min_total_n_recommended": min_total_n,
        "event_rate": round(event_rate, 4) if event_rate is not None else None,
        "adequacy": adequacy,
        "interpretation": interpretation,
        "rules": dict(EPV_RULES),
    }


# ---------------------------------------------------------------------------
# Mode 2 — Single-predictor logistic power (Hsieh et al. 1999 approximation)
# ---------------------------------------------------------------------------

def _hsieh_noncentrality(n: int, p: float, r: float, log_or: float) -> float:
    """Noncentrality proxy for Wald test on log(OR) with binary exposure."""
    if n <= 0 or p <= 0 or p >= 1 or r <= 0 or r >= 1 or log_or == 0:
        return 0.0
    return math.sqrt(max(0.0, n * p * (1.0 - p) * (log_or ** 2) * r * (1.0 - r)))


def _hsieh_power(n: int, p: float, r: float, odds_ratio: float, alpha: float) -> float:
    if odds_ratio <= 0 or n <= 0:
        return 0.0
    log_or = math.log(odds_ratio)
    z_alpha = stats.norm.ppf(1.0 - alpha / 2.0)
    ncp = _hsieh_noncentrality(n, p, r, log_or)
    if ncp <= 0:
        return 0.0
    z_beta = ncp - z_alpha
    return float(_clamp(stats.norm.cdf(z_beta), 0.0, 1.0))


def _hsieh_required_n(p: float, r: float, odds_ratio: float, alpha: float, target_power: float) -> int:
    if odds_ratio <= 0 or p <= 0 or p >= 1 or r <= 0 or r >= 1:
        return 0
    log_or = math.log(odds_ratio)
    z_alpha = stats.norm.ppf(1.0 - alpha / 2.0)
    z_beta = stats.norm.ppf(target_power)
    denom = p * (1.0 - p) * (log_or ** 2) * r * (1.0 - r)
    if denom <= 0:
        return 0
    n = ((z_alpha + z_beta) ** 2) / denom
    return max(2, int(math.ceil(n)))


def _mode_single_predictor(data: Dict[str, Any]) -> Dict[str, Any]:
    task = str(data.get("task", "power")).strip().lower()
    alpha = _parse_alpha(data)
    target_power = _parse_power(data)

    p = _clamp(float(data.get("outcome_prevalence", data.get("prevalence", data.get("p_outcome", 0.30)))), 0.01, 0.99)
    r = _clamp(float(data.get("exposure_prevalence", data.get("r_exposure", 0.50))), 0.01, 0.99)
    odds_ratio = float(data.get("odds_ratio", data.get("or", 1.5)))
    if odds_ratio <= 0:
        raise ValueError("odds_ratio must be positive")

    n = max(0, int(data.get("n", data.get("n_total", 0))))

    if task in ("required_n", "required", "plan"):
        required_n = _hsieh_required_n(p, r, odds_ratio, alpha, target_power)
        achieved = _hsieh_power(required_n, p, r, odds_ratio, alpha) if required_n > 0 else 0.0
        return {
            "mode": "single_predictor",
            "task": "required_n",
            "alpha": alpha,
            "target_power": target_power,
            "outcome_prevalence": p,
            "exposure_prevalence": r,
            "odds_ratio": odds_ratio,
            "required_n": required_n,
            "achieved_power": round(achieved, 4),
            "interpretation": (
                f"Need n≈{required_n} for {target_power*100:.0f}% power to detect OR={odds_ratio:.2f} "
                f"with outcome prevalence {p:.2f} and exposure prevalence {r:.2f}."
            ),
            "method": "Hsieh et al. (1999) normal approximation",
        }

    if n <= 0:
        raise ValueError("n is required for observed power (task=power)")

    observed_power = _hsieh_power(n, p, r, odds_ratio, alpha)
    req80 = _hsieh_required_n(p, r, odds_ratio, alpha, 0.80)
    req90 = _hsieh_required_n(p, r, odds_ratio, alpha, 0.90)

    return {
        "mode": "single_predictor",
        "task": "power",
        "alpha": alpha,
        "n": n,
        "outcome_prevalence": p,
        "exposure_prevalence": r,
        "odds_ratio": odds_ratio,
        "observed_power": round(observed_power, 4),
        "required_n_80": req80,
        "required_n_90": req90,
        "interpretation": _interpret_power(observed_power),
        "method": "Hsieh et al. (1999) normal approximation",
    }


# ---------------------------------------------------------------------------
# Mode 3 — Multivariable simulation
# ---------------------------------------------------------------------------

def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))


def _fit_logistic_irls(x: np.ndarray, y: np.ndarray, max_iter: int = 50, tol: float = 1e-7) -> Tuple[np.ndarray, np.ndarray]:
    """Fit logistic regression via IRLS. Returns (beta, cov_beta)."""
    n, k = x.shape
    beta = np.zeros(k, dtype=float)
    for _ in range(max_iter):
        eta = x @ beta
        mu = _sigmoid(eta)
        w = np.clip(mu * (1.0 - mu), 1e-9, None)
        z = eta + (y - mu) / w
        xw = x * w[:, None]
        hess = x.T @ xw
        try:
            delta = np.linalg.solve(hess, x.T @ (w * z))
        except np.linalg.LinAlgError:
            break
        beta_new = delta
        if np.max(np.abs(beta_new - beta)) < tol:
            beta = beta_new
            break
        beta = beta_new
    mu = _sigmoid(x @ beta)
    w = np.clip(mu * (1.0 - mu), 1e-9, None)
    xw = x * w[:, None]
    hess = x.T @ xw
    try:
        cov = np.linalg.inv(hess)
    except np.linalg.LinAlgError:
        cov = np.full((k, k), np.nan)
    return beta, cov


def _solve_intercept_for_prevalence(
    x_pred: np.ndarray,
    betas_pred: np.ndarray,
    target_prev: float,
    tol: float = 1e-4,
) -> float:
    """Binary search intercept so mean predicted probability matches target prevalence."""
    lo, hi = -8.0, 8.0
    for _ in range(60):
        mid = (lo + hi) / 2.0
        p = _sigmoid(mid + x_pred @ betas_pred).mean()
        if abs(p - target_prev) < tol:
            return mid
        if p < target_prev:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0


def _mode_multivariable_simulation(data: Dict[str, Any]) -> Dict[str, Any]:
    alpha = _parse_alpha(data)
    n = max(20, int(data.get("n", data.get("n_total", 200))))
    p_count = max(1, min(20, int(data.get("n_predictors", data.get("predictors", 3)))))
    target_prev = _clamp(float(data.get("outcome_prevalence", data.get("prevalence", 0.25))), 0.02, 0.98)
    rho = _clamp(float(data.get("predictor_correlation", data.get("rho", 0.0))), -0.95, 0.95)
    n_sim = max(50, min(5000, int(data.get("n_simulations", data.get("simulations", 500)))))
    coef_index = max(1, min(p_count, int(data.get("coefficient_index", 1))))

    or_list = data.get("effect_odds_ratios", data.get("odds_ratios", None))
    if isinstance(or_list, list) and len(or_list) >= p_count:
        odds_ratios = [float(v) for v in or_list[:p_count]]
    else:
        default_or = float(data.get("odds_ratio", 1.5))
        odds_ratios = [default_or] * p_count

    for orv in odds_ratios:
        if orv <= 0:
            raise ValueError("All effect_odds_ratios must be positive")

    betas_pred = np.log(np.array(odds_ratios, dtype=float))
    rng = np.random.default_rng(int(data.get("seed", 42)))

    # Correlated predictors: equicorrelation Gaussian → rank-normal transform to (0,1)
    cov = np.full((p_count, p_count), rho, dtype=float)
    np.fill_diagonal(cov, 1.0)
    cov = cov + np.eye(p_count) * 1e-6

    rejections = 0
    valid_sims = 0
    p_values: List[float] = []

    for _ in range(n_sim):
        z = rng.multivariate_normal(np.zeros(p_count), cov, size=n)
        u = stats.norm.cdf(z)
        x_pred = u

        intercept = _solve_intercept_for_prevalence(x_pred, betas_pred, target_prev)
        eta = intercept + x_pred @ betas_pred
        prob = _sigmoid(eta)
        y = rng.binomial(1, prob)

        if y.sum() in (0, n):
            continue

        x = np.column_stack([np.ones(n), x_pred])
        beta_hat, cov_beta = _fit_logistic_irls(x, y.astype(float))
        if not np.all(np.isfinite(beta_hat)) or not np.all(np.isfinite(cov_beta)):
            continue

        se = np.sqrt(np.clip(np.diag(cov_beta), 0.0, None))
        if se[coef_index] <= 0 or not np.isfinite(se[coef_index]):
            continue

        z_wald = beta_hat[coef_index] / se[coef_index]
        p_val = 2.0 * (1.0 - stats.norm.cdf(abs(z_wald)))
        p_values.append(float(p_val))
        valid_sims += 1
        if p_val < alpha:
            rejections += 1

    if valid_sims == 0:
        raise ValueError("Simulation produced no valid replications — adjust prevalence, n, or effects.")

    sim_power = rejections / valid_sims
    median_p = float(np.median(p_values)) if p_values else None

    return {
        "mode": "multivariable_simulation",
        "alpha": alpha,
        "n": n,
        "n_predictors": p_count,
        "outcome_prevalence": target_prev,
        "predictor_correlation": rho,
        "effect_odds_ratios": odds_ratios,
        "coefficient_index": coef_index,
        "n_simulations_requested": n_sim,
        "n_simulations_valid": valid_sims,
        "simulated_power": round(sim_power, 4),
        "median_p_value": round(median_p, 4) if median_p is not None else None,
        "interpretation": _interpret_power(sim_power),
        "method": f"Monte Carlo logistic IRLS ({valid_sims} valid simulations)",
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def logistic_power(request):
    """
    POST JSON body:
      mode: epv | single_predictor | multivariable_simulation
      (mode-specific fields — see README)
    """
    if request.method == "OPTIONS":
        return _response({"ok": True}, 204)

    if request.method != "POST":
        return _response({"ok": False, "error": "Use POST with JSON body."}, 405)

    try:
        data = request.get_json(silent=True) or {}
        mode = str(data.get("mode", "epv")).strip().lower()

        if mode in ("epv", "events_per_variable", "events-per-variable"):
            results = _mode_epv(data)
        elif mode in ("single_predictor", "single", "single-predictor"):
            results = _mode_single_predictor(data)
        elif mode in ("multivariable_simulation", "multivariable", "simulation", "sim"):
            results = _mode_multivariable_simulation(data)
        else:
            raise ValueError(
                f"Invalid mode '{mode}'. Use epv, single_predictor, or multivariable_simulation."
            )

        return _response({"ok": True, "input": {"mode": mode}, "results": results}, 200)

    except Exception as exc:
        return _response({"ok": False, "error": str(exc)}, 400)


# Local / Cloud Run entry alias
def main(request):
    return logistic_power(request)

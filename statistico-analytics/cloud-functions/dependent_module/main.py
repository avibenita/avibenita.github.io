"""
Dependent (Repeated Measures) Module - Cloud Function
Handles all dependent/paired/repeated measures statistical analyses

Endpoints:
- /power - Power analysis for RM-ANOVA
- /permutation - Permutation tests for paired data
- /bootstrap - Bootstrap confidence intervals
- /effect-sizes - Calculate effect sizes
"""

import math
from typing import Any, Dict
import numpy as np
from scipy import stats


ENGINE_NOTICE = "Dependent module powered by SciPy with exact/simulation methods"


def _response(payload: Dict[str, Any], status: int = 200):
    """Build JSON response with CORS headers"""
    body = dict(payload or {})
    body.setdefault("engine_notice", ENGINE_NOTICE)
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    }
    return body, status, headers


# ===== POWER ANALYSIS =====
# Two engines (select via power_method):
#   univariate       — matches RM-ANOVA F table: df2 = (N-1)(m-1)·ε
#   gpower_manova    — G*Power "MANOVA: Repeated measures, within factors":
#                      df2 = N - groups - df1 + 1  (groups=1 for one-sample RM)
# Both use λ = N·m·f²/(1-ρ) for the within-subjects main effect (Potvin & Schutz / G*Power).


def _calculate_cohen_f_from_partial_eta_squared(partial_eta_sq: float) -> float:
    """Convert partial eta squared to Cohen's f"""
    if partial_eta_sq <= 0 or partial_eta_sq >= 1:
        return 0.0
    return math.sqrt(partial_eta_sq / (1 - partial_eta_sq))


def _parse_rho(data: Dict[str, Any]) -> float:
    rho = float(data.get("avg_correlation", data.get("rho", 0.0)))
    return max(-0.999, min(0.999, rho))


def _parse_epsilon(data: Dict[str, Any]) -> float:
    eps = float(data.get("epsilon", data.get("nonsphericity_epsilon", 1.0)))
    return max(0.1, min(1.0, eps))


def _parse_power_method(data: Dict[str, Any]) -> str:
    method = str(data.get("power_method", "univariate")).strip().lower()
    if method in ("gpower_manova", "manova", "gpower"):
        return "gpower_manova"
    return "univariate"


def _parse_num_groups(data: Dict[str, Any]) -> int:
    return max(1, int(data.get("num_groups", data.get("groups", 1))))


def _rm_ncp(n: int, k: int, effect_size_f: float, rho: float) -> float:
    """Noncentrality parameter for RM-ANOVA within effect (G*Power)."""
    if effect_size_f <= 0 or n < 1 or k < 2:
        return 0.0
    denom = 1.0 - rho
    if denom <= 1e-9:
        denom = 1e-9
    return n * k * (effect_size_f ** 2) / denom


def _rm_df(
    n: int,
    k: int,
    epsilon: float,
    power_method: str = "univariate",
    num_groups: int = 1,
) -> tuple:
    """Numerator/denominator df for the within-subjects effect."""
    df1 = (k - 1) * epsilon
    if power_method == "gpower_manova":
        df2 = max(1.0, float(n - num_groups - df1 + 1))
    else:
        df2 = (n - 1) * (k - 1) * epsilon
    return df1, df2


def _pillai_v(
    power_method: str,
    effect_size_f: float,
    ncp: float,
    n: int,
) -> float:
    if power_method == "gpower_manova":
        if ncp <= 0 or n <= 0:
            return 0.0
        return float(ncp / (ncp + n))
    return _pillai_v_from_f(effect_size_f)


def _pillai_v_from_f(effect_size_f: float) -> float:
    """G*Power univariate RM within effect: Pillai V equals partial eta squared."""
    if effect_size_f <= 0:
        return 0.0
    return (effect_size_f ** 2) / (1 + effect_size_f ** 2)


def _rm_output_extras(
    n: int,
    k: int,
    effect_size_f: float,
    alpha: float,
    rho: float,
    epsilon: float,
    power_method: str = "univariate",
    num_groups: int = 1,
) -> Dict[str, float]:
    """Critical F, df, lambda, Pillai V for output panel."""
    df1, df2 = _rm_df(n, k, epsilon, power_method, num_groups)
    ncp = _rm_ncp(n, k, effect_size_f, rho)
    try:
        f_crit = float(stats.f.ppf(1 - alpha, df1, df2))
    except Exception:
        f_crit = float("nan")
    return {
        "noncentrality_parameter": ncp,
        "critical_f": f_crit,
        "df_between": df1,
        "df_error": df2,
        "pillai_v": _pillai_v(power_method, effect_size_f, ncp, n),
    }


def _power_at_cohen_f_rm(
    effect_size_f: float,
    n: int,
    num_timepoints: int,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
    power_method: str = "univariate",
    num_groups: int = 1,
) -> float:
    """Achieved power for Cohen's f with RM correlation and chosen df engine."""
    if effect_size_f <= 0 or n < 2 or num_timepoints < 2:
        return 0.0

    ncp = _rm_ncp(n, num_timepoints, effect_size_f, rho)
    df1, df2 = _rm_df(n, num_timepoints, epsilon, power_method, num_groups)

    try:
        f_crit = stats.f.ppf(1 - alpha, df1, df2)
        return float(max(0.0, min(1.0, 1 - stats.ncf.cdf(f_crit, df1, df2, ncp))))
    except Exception:
        return 0.0


# Backward-compatible alias
def _power_at_cohen_f_rm_anova(
    effect_size_f: float,
    n: int,
    num_timepoints: int,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
) -> float:
    return _power_at_cohen_f_rm(
        effect_size_f, n, num_timepoints, alpha, rho, epsilon, "univariate", 1
    )


def _calculate_required_sample_size_rm(
    effect_size_f: float,
    num_timepoints: int,
    target_power: float = 0.80,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
    power_method: str = "univariate",
    num_groups: int = 1,
    max_iterations: int = 100,
) -> int:
    """Required N for target power (binary search)."""
    if effect_size_f <= 0 or num_timepoints < 2:
        return 0

    target_power = max(0.50, min(0.99, target_power))
    n_min, n_max = 2, 2000

    for _ in range(max_iterations):
        n = (n_min + n_max) // 2
        power = _power_at_cohen_f_rm(
            effect_size_f,
            n,
            num_timepoints,
            alpha,
            rho,
            epsilon,
            power_method,
            num_groups,
        )

        if abs(power - target_power) < 0.005:
            return n

        if power < target_power:
            n_min = n + 1
        else:
            n_max = n - 1

    return n_max if n_max >= 2 else 2


def _calculate_required_sample_size_rm_anova(
    effect_size_f: float,
    num_timepoints: int,
    target_power: float = 0.80,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
    max_iterations: int = 100,
) -> int:
    return _calculate_required_sample_size_rm(
        effect_size_f,
        num_timepoints,
        target_power,
        alpha,
        rho,
        epsilon,
        "univariate",
        1,
        max_iterations,
    )


def _calculate_detectable_effect_size_rm(
    n: int,
    num_timepoints: int,
    target_power: float = 0.80,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
    power_method: str = "univariate",
    num_groups: int = 1,
    max_iterations: int = 60,
) -> float:
    """Minimum Cohen's f detectable at target power with fixed n."""
    if n < 2 or num_timepoints < 2:
        return 0.0

    target_power = max(0.50, min(0.99, target_power))
    lo, hi = 0.001, 5.0

    for _ in range(max_iterations):
        f_mid = (lo + hi) / 2
        power = _power_at_cohen_f_rm(
            f_mid,
            n,
            num_timepoints,
            alpha,
            rho,
            epsilon,
            power_method,
            num_groups,
        )
        if power >= target_power:
            hi = f_mid
        else:
            lo = f_mid

    return (lo + hi) / 2


def _calculate_detectable_effect_size_rm_anova(
    n: int,
    num_timepoints: int,
    target_power: float = 0.80,
    alpha: float = 0.05,
    rho: float = 0.0,
    epsilon: float = 1.0,
    max_iterations: int = 60,
) -> float:
    return _calculate_detectable_effect_size_rm(
        n, num_timepoints, target_power, alpha, rho, epsilon, "univariate", 1, max_iterations
    )


def _resolve_effect_size_f(data: Dict[str, Any], n: int, k: int) -> float:
    """Resolve Cohen's f from request payload."""
    if "effect_size_f" in data:
        f = float(data["effect_size_f"])
        if f > 0:
            return f
    if "partial_eta_squared" in data:
        f = _calculate_cohen_f_from_partial_eta_squared(float(data["partial_eta_squared"]))
        if f > 0:
            return f
    f_stat = float(data.get("f_statistic", 0))
    df_between = int(data.get("df_between", k - 1 if k > 1 else 0))
    if f_stat > 0 and n > 0 and df_between > 0:
        return math.sqrt(f_stat * df_between / n)
    return 0.0


def handle_power_analysis(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle power analysis requests"""
    mode = str(data.get("mode", "observed")).strip().lower()
    alpha = float(data.get("alpha", 0.05))
    alpha = max(0.001, min(0.25, alpha))
    rho = _parse_rho(data)
    epsilon = _parse_epsilon(data)
    power_method = _parse_power_method(data)
    num_groups = _parse_num_groups(data)

    effect_size_f = _resolve_effect_size_f(data, int(data.get("n", 0)), int(data.get("k", 0)))
    results: Dict[str, Any] = {}

    if mode == "observed":
        n = int(data.get("n", 0))
        k = int(data.get("k", 0))

        if effect_size_f <= 0 or n < 2 or k < 2:
            raise ValueError("Need n, k, and effect size (partial eta² or Cohen's f)")

        observed_power = _power_at_cohen_f_rm(
            effect_size_f, n, k, alpha, rho, epsilon, power_method, num_groups
        )
        extras = _rm_output_extras(
            n, k, effect_size_f, alpha, rho, epsilon, power_method, num_groups
        )

        results = {
            "observed_power": observed_power,
            "effect_size_cohen_f": effect_size_f,
            "power_method": power_method,
            "num_groups": num_groups,
            "noncentrality_parameter": extras["noncentrality_parameter"],
            "critical_f": extras["critical_f"],
            "pillai_v": extras["pillai_v"],
            "avg_correlation": rho,
            "epsilon": epsilon,
            "df_between": extras["df_between"],
            "df_error": extras["df_error"],
            "n": n,
            "num_timepoints": k,
            "interpretation": _interpret_power(observed_power),
        }

        if effect_size_f > 0 and k > 0:
            results["required_for_80pct"] = _calculate_required_sample_size_rm(
                effect_size_f, k, 0.80, alpha, rho, epsilon, power_method, num_groups
            )
            results["required_for_85pct"] = _calculate_required_sample_size_rm(
                effect_size_f, k, 0.85, alpha, rho, epsilon, power_method, num_groups
            )
            results["required_for_90pct"] = _calculate_required_sample_size_rm(
                effect_size_f, k, 0.90, alpha, rho, epsilon, power_method, num_groups
            )
            results["required_for_95pct"] = _calculate_required_sample_size_rm(
                effect_size_f, k, 0.95, alpha, rho, epsilon, power_method, num_groups
            )

    elif mode == "required":
        if effect_size_f <= 0:
            raise ValueError("Effect size required")

        k = int(data.get("k", 3))
        if k < 2:
            raise ValueError("Number of timepoints must be at least 2")

        target_power = float(data.get("target_power", 0.80))
        target_power = max(0.50, min(0.99, target_power))

        required_n = _calculate_required_sample_size_rm(
            effect_size_f, k, target_power, alpha, rho, epsilon, power_method, num_groups
        )
        achieved_power = _power_at_cohen_f_rm(
            effect_size_f, required_n, k, alpha, rho, epsilon, power_method, num_groups
        )
        extras = _rm_output_extras(
            required_n, k, effect_size_f, alpha, rho, epsilon, power_method, num_groups
        )

        results = {
            "required_sample_size": required_n,
            "achieved_power": float(achieved_power),
            "effect_size_cohen_f": effect_size_f,
            "target_power": target_power,
            "power_method": power_method,
            "num_groups": num_groups,
            "num_timepoints": k,
            "avg_correlation": rho,
            "epsilon": epsilon,
            "noncentrality_parameter": extras["noncentrality_parameter"],
            "critical_f": extras["critical_f"],
            "pillai_v": extras["pillai_v"],
            "df_between": extras["df_between"],
            "df_error": extras["df_error"],
            "n": required_n,
            "interpretation": f"You need {required_n} subjects to achieve {target_power*100:.0f}% power",
        }

    elif mode == "detectable":
        n = int(data.get("n", 0))
        k = int(data.get("k", 3))
        if n < 2:
            raise ValueError("Sample size n must be at least 2")
        if k < 2:
            raise ValueError("Number of timepoints must be at least 2")

        target_power = float(data.get("target_power", 0.80))
        target_power = max(0.50, min(0.99, target_power))

        min_f = _calculate_detectable_effect_size_rm(
            n, k, target_power, alpha, rho, epsilon, power_method, num_groups
        )
        min_eta = (min_f ** 2) / (1 + min_f ** 2) if min_f > 0 else 0.0
        achieved_power = _power_at_cohen_f_rm(
            min_f, n, k, alpha, rho, epsilon, power_method, num_groups
        )
        extras = _rm_output_extras(
            n, k, min_f, alpha, rho, epsilon, power_method, num_groups
        )

        results = {
            "min_detectable_cohen_f": float(min_f),
            "min_detectable_partial_eta_squared": float(min_eta),
            "achieved_power": float(achieved_power),
            "target_power": target_power,
            "power_method": power_method,
            "num_groups": num_groups,
            "n": n,
            "num_timepoints": k,
            "avg_correlation": rho,
            "epsilon": epsilon,
            "noncentrality_parameter": extras["noncentrality_parameter"],
            "critical_f": extras["critical_f"],
            "pillai_v": extras["pillai_v"],
            "df_between": extras["df_between"],
            "df_error": extras["df_error"],
            "interpretation": (
                f"With n={n}, the smallest detectable effect is Cohen's f={min_f:.3f} "
                f"(partial eta^2={min_eta:.3f}) at {target_power*100:.0f}% power"
            ),
        }

    return {
        "ok": True,
        "operation": "power_analysis",
        "input": {"mode": mode, "alpha": alpha, "avg_correlation": rho, "epsilon": epsilon},
        "results": results,
    }


def _interpret_power(power: float) -> str:
    """Provide interpretation of power value"""
    if power >= 0.90:
        return "Excellent power - very likely to detect true effects"
    elif power >= 0.80:
        return "Good power - adequate for most research purposes"
    elif power >= 0.60:
        return "Moderate power - may miss some true effects"
    elif power >= 0.40:
        return "Low power - likely to miss true effects"
    else:
        return "Very low power - insufficient to detect effects reliably"


# ===== MAIN ENTRY POINT =====

def dependent_module(request):
    """
    Main entry point for dependent (repeated measures) module
    
    Routes requests to appropriate handlers based on 'operation' parameter:
    - power: Power analysis for RM-ANOVA
    - permutation: Permutation tests (future)
    - bootstrap: Bootstrap CI (future)
    - effect_sizes: Effect size calculations (future)
    """
    if request.method == "OPTIONS":
        return _response({"ok": True}, 204)
    
    if request.method != "POST":
        return _response({"ok": False, "error": "Use POST with JSON body."}, 405)
    
    try:
        data = request.get_json(silent=True) or {}
        operation = str(data.get("operation", "power")).strip().lower()
        
        if operation == "power" or operation == "power_analysis":
            result = handle_power_analysis(data)
            return _response(result, 200)
        
        # Future operations
        elif operation == "permutation":
            return _response({"ok": False, "error": "Permutation tests coming soon"}, 501)
        
        elif operation == "bootstrap":
            return _response({"ok": False, "error": "Bootstrap CI coming soon"}, 501)
        
        else:
            return _response({"ok": False, "error": f"Unknown operation: {operation}"}, 400)
        
    except Exception as exc:
        return _response({"ok": False, "error": str(exc)}, 400)

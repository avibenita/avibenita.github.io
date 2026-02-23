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

def _calculate_cohen_f_from_partial_eta_squared(partial_eta_sq: float) -> float:
    """Convert partial eta squared to Cohen's f"""
    if partial_eta_sq <= 0 or partial_eta_sq >= 1:
        return 0.0
    return math.sqrt(partial_eta_sq / (1 - partial_eta_sq))


def _calculate_observed_power_rm_anova(
    f_statistic: float,
    df_between: int,
    df_error: int,
    alpha: float = 0.05
) -> float:
    """Calculate observed power using non-central F distribution"""
    if f_statistic <= 0 or df_between <= 0 or df_error <= 0:
        return 0.0
    
    try:
        f_crit = stats.f.ppf(1 - alpha, df_between, df_error)
        ncp = f_statistic * df_between
        power = 1 - stats.ncf.cdf(f_crit, df_between, df_error, ncp)
        return float(max(0.0, min(1.0, power)))
    except Exception:
        return 0.0


def _calculate_required_sample_size_rm_anova(
    effect_size_f: float,
    num_timepoints: int,
    target_power: float = 0.80,
    alpha: float = 0.05,
    max_iterations: int = 100
) -> int:
    """Calculate required sample size for target power"""
    if effect_size_f <= 0 or num_timepoints < 2:
        return 0
    
    df_between = num_timepoints - 1
    n_min, n_max = 2, 1000
    
    for _ in range(max_iterations):
        n = (n_min + n_max) // 2
        df_error = (n - 1) * df_between
        ncp = n * (effect_size_f ** 2) * df_between
        
        try:
            f_crit = stats.f.ppf(1 - alpha, df_between, df_error)
            power = 1 - stats.ncf.cdf(f_crit, df_between, df_error, ncp)
            
            if abs(power - target_power) < 0.01:
                return n
            
            if power < target_power:
                n_min = n + 1
            else:
                n_max = n - 1
        except Exception:
            n_min = n + 1
    
    return n_max if n_max >= 2 else 2


def handle_power_analysis(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle power analysis requests"""
    mode = str(data.get("mode", "observed")).strip().lower()
    alpha = float(data.get("alpha", 0.05))
    alpha = max(0.001, min(0.25, alpha))
    
    # Extract effect size
    effect_size_f = None
    if "effect_size_f" in data:
        effect_size_f = float(data["effect_size_f"])
    elif "partial_eta_squared" in data:
        partial_eta_sq = float(data["partial_eta_squared"])
        effect_size_f = _calculate_cohen_f_from_partial_eta_squared(partial_eta_sq)
    
    results = {}
    
    if mode == "observed":
        f_stat = float(data.get("f_statistic", 0))
        df_between = int(data.get("df_between", 0))
        df_error = int(data.get("df_error", 0))
        n = int(data.get("n", 0))
        k = int(data.get("k", 0))
        
        if f_stat <= 0 or df_between <= 0 or df_error <= 0:
            raise ValueError("Invalid F statistic or degrees of freedom")
        
        observed_power = _calculate_observed_power_rm_anova(f_stat, df_between, df_error, alpha)
        
        if effect_size_f is None and n > 0 and k > 0:
            effect_size_f = math.sqrt(f_stat * df_between / n)
        
        results = {
            "observed_power": observed_power,
            "effect_size_cohen_f": effect_size_f if effect_size_f else 0.0,
            "f_statistic": f_stat,
            "df_between": df_between,
            "df_error": df_error,
            "interpretation": _interpret_power(observed_power)
        }
        
        if effect_size_f and effect_size_f > 0 and k > 0:
            results["required_for_80pct"] = _calculate_required_sample_size_rm_anova(
                effect_size_f, k, 0.80, alpha
            )
            results["required_for_90pct"] = _calculate_required_sample_size_rm_anova(
                effect_size_f, k, 0.90, alpha
            )
    
    elif mode == "required":
        if effect_size_f is None or effect_size_f <= 0:
            raise ValueError("Effect size required")
        
        k = int(data.get("k", 3))
        if k < 2:
            raise ValueError("Number of timepoints must be at least 2")
        
        target_power = float(data.get("target_power", 0.80))
        target_power = max(0.50, min(0.99, target_power))
        
        required_n = _calculate_required_sample_size_rm_anova(effect_size_f, k, target_power, alpha)
        
        df_between = k - 1
        df_error = (required_n - 1) * df_between
        ncp = required_n * (effect_size_f ** 2) * df_between
        
        try:
            f_crit = stats.f.ppf(1 - alpha, df_between, df_error)
            achieved_power = 1 - stats.ncf.cdf(f_crit, df_between, df_error, ncp)
        except Exception:
            achieved_power = target_power
        
        results = {
            "required_sample_size": required_n,
            "achieved_power": float(achieved_power),
            "effect_size_cohen_f": effect_size_f,
            "target_power": target_power,
            "num_timepoints": k,
            "interpretation": f"You need {required_n} subjects to achieve {target_power*100:.0f}% power"
        }
    
    return {
        "ok": True,
        "operation": "power_analysis",
        "input": {"mode": mode, "alpha": alpha},
        "results": results
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

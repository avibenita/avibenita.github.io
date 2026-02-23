"""
Repeated Measures ANOVA Power Analysis Cloud Function
Calculates observed power and required sample size for RM-ANOVA designs
"""

import math
from typing import Any, Dict
import numpy as np
from scipy import stats


ENGINE_NOTICE = "RM-ANOVA power calculations use SciPy-based engine with non-central F distribution"


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
    """
    Calculate observed power for repeated measures ANOVA
    using non-central F distribution
    
    Args:
        f_statistic: Observed F statistic
        df_between: Degrees of freedom for time/condition (numerator)
        df_error: Degrees of freedom for error (denominator)
        alpha: Significance level
        
    Returns:
        Observed power (0 to 1)
    """
    if f_statistic <= 0 or df_between <= 0 or df_error <= 0:
        return 0.0
    
    try:
        # Critical F value at alpha level
        f_crit = stats.f.ppf(1 - alpha, df_between, df_error)
        
        # Non-centrality parameter from observed F
        # λ = F * df1
        ncp = f_statistic * df_between
        
        # Power = 1 - P(F_ncf < F_critical)
        # where F_ncf follows non-central F distribution
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
    """
    Calculate required sample size for target power in RM-ANOVA
    
    Args:
        effect_size_f: Cohen's f effect size
        num_timepoints: Number of repeated measurements (k)
        target_power: Desired power level
        alpha: Significance level
        max_iterations: Maximum iterations for search
        
    Returns:
        Required sample size (n subjects)
    """
    if effect_size_f <= 0 or num_timepoints < 2:
        return 0
    
    df_between = num_timepoints - 1
    
    # Binary search for required sample size
    n_min, n_max = 2, 1000
    
    for _ in range(max_iterations):
        n = (n_min + n_max) // 2
        df_error = (n - 1) * df_between
        
        # Non-centrality parameter: λ = n * f² * df1
        ncp = n * (effect_size_f ** 2) * df_between
        
        # Critical F value
        try:
            f_crit = stats.f.ppf(1 - alpha, df_between, df_error)
            
            # Calculate power
            power = 1 - stats.ncf.cdf(f_crit, df_between, df_error, ncp)
            
            if abs(power - target_power) < 0.01:
                return n
            
            if power < target_power:
                n_min = n + 1
            else:
                n_max = n - 1
                
        except Exception:
            n_min = n + 1
    
    # Return the conservative estimate
    return n_max if n_max >= 2 else 2


def rm_anova_power(request):
    """
    Cloud function entry point for RM-ANOVA power analysis
    
    Expected POST JSON body:
    {
        "mode": "observed" | "required",
        "f_statistic": float (for observed mode),
        "df_between": int (k-1, where k = num timepoints),
        "df_error": int ((n-1) * (k-1)),
        "n": int (number of subjects, for observed mode),
        "k": int (number of timepoints),
        "effect_size_f": float (for required mode or from partial_eta_sq),
        "partial_eta_squared": float (alternative to effect_size_f),
        "target_power": float (default 0.80, for required mode),
        "alpha": float (default 0.05)
    }
    
    Returns:
    {
        "ok": True,
        "input": {...},
        "results": {
            "observed_power": float,
            "required_sample_size": int,
            "effect_size_cohen_f": float,
            "interpretation": string
        }
    }
    """
    if request.method == "OPTIONS":
        return _response({"ok": True}, 204)
    
    if request.method != "POST":
        return _response({"ok": False, "error": "Use POST with JSON body."}, 405)
    
    try:
        data = request.get_json(silent=True) or {}
        
        mode = str(data.get("mode", "observed")).strip().lower()
        alpha = float(data.get("alpha", 0.05))
        alpha = max(0.001, min(0.25, alpha))
        
        # Extract effect size (Cohen's f)
        effect_size_f = None
        if "effect_size_f" in data:
            effect_size_f = float(data["effect_size_f"])
        elif "partial_eta_squared" in data:
            partial_eta_sq = float(data["partial_eta_squared"])
            effect_size_f = _calculate_cohen_f_from_partial_eta_squared(partial_eta_sq)
        
        results = {}
        
        if mode == "observed":
            # Calculate observed power from ANOVA results
            f_stat = float(data.get("f_statistic", 0))
            df_between = int(data.get("df_between", 0))
            df_error = int(data.get("df_error", 0))
            n = int(data.get("n", 0))
            k = int(data.get("k", 0))
            
            if f_stat <= 0 or df_between <= 0 or df_error <= 0:
                raise ValueError("Invalid F statistic or degrees of freedom")
            
            observed_power = _calculate_observed_power_rm_anova(
                f_stat, df_between, df_error, alpha
            )
            
            # If effect size not provided, calculate from F statistic
            if effect_size_f is None and n > 0 and k > 0:
                # Approximate Cohen's f from F statistic
                # f = sqrt(F * df1 / n)
                effect_size_f = math.sqrt(f_stat * df_between / n)
            
            results = {
                "observed_power": observed_power,
                "effect_size_cohen_f": effect_size_f if effect_size_f else 0.0,
                "f_statistic": f_stat,
                "df_between": df_between,
                "df_error": df_error,
                "interpretation": _interpret_power(observed_power)
            }
            
            # Also calculate required sample size for target power levels
            if effect_size_f and effect_size_f > 0 and k > 0:
                results["required_for_80pct"] = _calculate_required_sample_size_rm_anova(
                    effect_size_f, k, 0.80, alpha
                )
                results["required_for_90pct"] = _calculate_required_sample_size_rm_anova(
                    effect_size_f, k, 0.90, alpha
                )
        
        elif mode == "required":
            # Calculate required sample size for target power
            if effect_size_f is None or effect_size_f <= 0:
                raise ValueError("Effect size (Cohen's f or partial eta squared) is required")
            
            k = int(data.get("k", 3))
            if k < 2:
                raise ValueError("Number of timepoints (k) must be at least 2")
            
            target_power = float(data.get("target_power", 0.80))
            target_power = max(0.50, min(0.99, target_power))
            
            required_n = _calculate_required_sample_size_rm_anova(
                effect_size_f, k, target_power, alpha
            )
            
            # Calculate achieved power with this n
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
        
        else:
            raise ValueError(f"Invalid mode: {mode}. Use 'observed' or 'required'")
        
        return _response({
            "ok": True,
            "input": {
                "mode": mode,
                "alpha": alpha,
                **({"target_power": data.get("target_power", 0.80)} if mode == "required" else {})
            },
            "results": results
        }, 200)
        
    except Exception as exc:
        return _response({"ok": False, "error": str(exc)}, 400)


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

"""
Cloud Function for ANOVA Power Analysis
Calculates required sample size for one-way ANOVA using non-central F-distribution
"""
from flask import jsonify, make_response
from scipy.stats import ncf
from scipy.stats import f as f_dist

# CORS: allow browser fetch() from Statistico (GitHub Pages, custom domain, Office add-in)
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
}


def _json_cors(data, status=200):
    """JSON response with CORS headers (required for statistico.live → Cloud Functions)."""
    r = jsonify(data)
    for k, v in CORS_HEADERS.items():
        r.headers[k] = v
    return r, status


def anova_module(request):
    """
    Calculate required sample size for one-way ANOVA

    Parameters:
    - num_groups: Number of groups (k)
    - effect_size_f: Cohen's f effect size
    - target_power: Desired statistical power (default 0.8)
    - significance_level: Alpha level (default 0.05)
    """
    # Preflight (browser sends OPTIONS before GET)
    if request.method == "OPTIONS":
        resp = make_response("", 204)
        for k, v in CORS_HEADERS.items():
            resp.headers[k] = v
        return resp

    if request.method != "GET":
        return _json_cors({"error": "Method not allowed"}, 405)

    try:
        num_groups = int(request.args.get("num_groups", 3))
        effect_size_f = float(request.args.get("effect_size_f", 0.25))
        target_power = float(request.args.get("target_power", 0.8))
        alpha = float(request.args.get("significance_level", 0.05))

        # Accept mistaken "percent" input (e.g. 95 or 095 parsed as 95 from clients)
        if target_power > 1.0 and target_power <= 100.0:
            target_power = target_power / 100.0

        if num_groups < 2:
            return _json_cors({"error": "num_groups must be at least 2"}, 400)
        if effect_size_f <= 0:
            return _json_cors({"error": "effect_size_f must be positive"}, 400)
        if not (0 < target_power < 1):
            return _json_cors({"error": "target_power must be between 0 and 1"}, 400)
        if not (0 < alpha < 1):
            return _json_cors({"error": "significance_level must be between 0 and 1"}, 400)

        df1 = num_groups - 1

        def power_at_n(n_per_group):
            df2 = (n_per_group * num_groups) - num_groups
            if df2 <= 0:
                return 0
            ncp = n_per_group * num_groups * effect_size_f * effect_size_f
            f_critical = f_dist.ppf(1 - alpha, df1, df2)
            return 1 - ncf.cdf(f_critical, df1, df2, ncp)

        low, high = 2, 2000
        max_iterations = 50
        iteration = 0

        while high - low > 1 and iteration < max_iterations:
            mid = (low + high) // 2
            if power_at_n(mid) < target_power:
                low = mid
            else:
                high = mid
            iteration += 1

        n_per_group = high
        actual_power = power_at_n(n_per_group)
        total_n = n_per_group * num_groups

        return _json_cors(
            {
                "required_sample_size_per_group": int(n_per_group),
                "total_sample_size": int(total_n),
                "actual_power": round(actual_power, 4),
                "parameters": {
                    "num_groups": num_groups,
                    "effect_size_f": effect_size_f,
                    "target_power": target_power,
                    "significance_level": alpha,
                },
            }
        )

    except ValueError as e:
        return _json_cors({"error": f"Invalid parameter: {str(e)}"}, 400)
    except Exception as e:
        return _json_cors({"error": f"Calculation error: {str(e)}"}, 500)

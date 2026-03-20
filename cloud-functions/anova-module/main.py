"""
Cloud Function for ANOVA Power Analysis
Calculates required sample size for one-way ANOVA using non-central F-distribution
"""
from flask import jsonify
from scipy.stats import ncf  # non-central F-distribution
import math

def anova_module(request):
    """
    Calculate required sample size for one-way ANOVA
    
    Parameters:
    - num_groups: Number of groups (k)
    - effect_size_f: Cohen's f effect size
    - target_power: Desired statistical power (default 0.8)
    - significance_level: Alpha level (default 0.05)
    
    Returns:
    JSON with required_sample_size_per_group, total_sample_size, and actual_power
    """
    try:
        # Get parameters from request
        num_groups = int(request.args.get('num_groups', 3))
        effect_size_f = float(request.args.get('effect_size_f', 0.25))
        target_power = float(request.args.get('target_power', 0.8))
        alpha = float(request.args.get('significance_level', 0.05))
        
        # Validate inputs
        if num_groups < 2:
            return jsonify({'error': 'num_groups must be at least 2'}), 400
        if effect_size_f <= 0:
            return jsonify({'error': 'effect_size_f must be positive'}), 400
        if not (0 < target_power < 1):
            return jsonify({'error': 'target_power must be between 0 and 1'}), 400
        if not (0 < alpha < 1):
            return jsonify({'error': 'significance_level must be between 0 and 1'}), 400
        
        df1 = num_groups - 1  # degrees of freedom for numerator
        
        def power_at_n(n_per_group):
            """Calculate power for given sample size per group"""
            df2 = (n_per_group * num_groups) - num_groups  # degrees of freedom for denominator
            if df2 <= 0:
                return 0
            
            # Non-centrality parameter: lambda = n * k * f^2
            ncp = n_per_group * num_groups * effect_size_f * effect_size_f
            
            # Critical F value under null hypothesis (central F-distribution)
            from scipy.stats import f
            f_critical = f.ppf(1 - alpha, df1, df2)
            
            # Power = 1 - CDF of non-central F at critical value
            power = 1 - ncf.cdf(f_critical, df1, df2, ncp)
            return power
        
        # Binary search for required sample size
        low, high = 2, 2000
        max_iterations = 50
        iteration = 0
        
        while high - low > 1 and iteration < max_iterations:
            mid = (low + high) // 2
            power_at_mid = power_at_n(mid)
            
            if power_at_mid < target_power:
                low = mid
            else:
                high = mid
            iteration += 1
        
        n_per_group = high
        actual_power = power_at_n(n_per_group)
        total_n = n_per_group * num_groups
        
        return jsonify({
            'required_sample_size_per_group': int(n_per_group),
            'total_sample_size': int(total_n),
            'actual_power': round(actual_power, 4),
            'parameters': {
                'num_groups': num_groups,
                'effect_size_f': effect_size_f,
                'target_power': target_power,
                'significance_level': alpha
            }
        })
        
    except ValueError as e:
        return jsonify({'error': f'Invalid parameter: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Calculation error: {str(e)}'}), 500

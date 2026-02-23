/**
 * Pure JavaScript OLS Regression Computation
 * Computes regression coefficients, standard errors, t-values, p-values, R², F-test, etc.
 */

// ============================================================================
// MAIN OLS COMPUTATION
// ============================================================================

function computeOLS(X, Y, includeIntercept = true, alpha = 0.05, computeVIFFlag = false) {
    const n = Y.length;
    const p = X[0].length;
    
    // Add intercept column if requested
    if (includeIntercept) {
        X = X.map(row => [1, ...row]);
    }
    
    const k = X[0].length; // Number of parameters (including intercept if any)
    
    // Compute X'X
    const XtX = matrixMultiply(transpose(X), X);
    
    // Compute (X'X)^-1
    const XtX_inv = matrixInverse(XtX);
    
    // Compute coefficients: β = (X'X)^-1 X'Y
    const Xt = transpose(X);
    const XtY = matrixMultiply(Xt, Y.map(y => [y]));
    const beta = matrixMultiply(XtX_inv, XtY).map(row => row[0]);
    
    // Compute fitted values and residuals
    const Y_fit = X.map(row => row.reduce((sum, xi, i) => sum + xi * beta[i], 0));
    const residuals = Y.map((yi, i) => yi - Y_fit[i]);
    
    // Compute sum of squares
    const Y_mean = Y.reduce((sum, y) => sum + y, 0) / n;
    const TSS = Y.reduce((sum, y) => sum + Math.pow(y - Y_mean, 2), 0);
    const SSR = residuals.reduce((sum, r) => sum + r * r, 0);
    const SSE = TSS - SSR;
    
    // R² and Adjusted R²
    const R2 = 1 - (SSR / TSS);
    const R2_adj = 1 - ((1 - R2) * (n - 1) / (n - k));
    
    // Standard error of regression
    const MSE = SSR / (n - k);
    const RMSE = Math.sqrt(MSE);
    
    // Standard errors of coefficients
    const SE = beta.map((_, i) => Math.sqrt(XtX_inv[i][i] * MSE));
    
    // t-values
    const t_values = beta.map((b, i) => b / SE[i]);
    
    // p-values (two-tailed t-test)
    const df = n - k;
    const p_values = t_values.map(t => 2 * (1 - tCDF(Math.abs(t), df)));
    
    // Confidence intervals
    const t_crit = tInverse(alpha / 2, df);
    const CI_lower = beta.map((b, i) => b - t_crit * SE[i]);
    const CI_upper = beta.map((b, i) => b + t_crit * SE[i]);
    
    // F-statistic
    const F_stat = (SSE / (k - 1)) / (SSR / (n - k));
    const F_pvalue = 1 - fCDF(F_stat, k - 1, n - k);
    
    // AIC and BIC
    const AIC = n * Math.log(SSR / n) + 2 * k;
    const BIC = n * Math.log(SSR / n) + k * Math.log(n);
    
    // VIF calculation (optional - expensive for large models)
    const VIF = computeVIFFlag ? computeVIF(X, includeIntercept) : [];
    
    return {
        coefficients: beta,
        std_errors: SE,
        t_values: t_values,
        p_values: p_values,
        CI_lower: CI_lower,
        CI_upper: CI_upper,
        R2: R2,
        R2_adj: R2_adj,
        RMSE: RMSE,
        MSE: MSE,
        F_stat: F_stat,
        F_pvalue: F_pvalue,
        AIC: AIC,
        BIC: BIC,
        TSS: TSS,
        SSR: SSR,
        SSE: SSE,
        n: n,
        k: k,
        p: p,
        df: df,
        includeIntercept: includeIntercept,
        alpha: alpha,
        residuals: residuals,
        Y_fit: Y_fit,
        VIF: VIF
    };
}

// ============================================================================
// VIF COMPUTATION
// ============================================================================

function computeVIF(X, includeIntercept) {
    if (X[0].length <= 1) {
        return []; // No VIF for single predictor
    }
    
    const VIF = [];
    const startIdx = includeIntercept ? 1 : 0; // Skip intercept column if present
    
    for (let j = startIdx; j < X[0].length; j++) {
        try {
            // Extract X_j and X_{-j}
            const X_j = X.map(row => row[j]);
            const X_minus_j = X.map(row => row.filter((_, idx) => idx !== j));
            
            // Regress X_j on X_{-j}
            const results = computeOLS(X_minus_j, X_j, false, 0.05);
            const R2_j = results.R2;
            
            // VIF = 1 / (1 - R²)
            const vif = R2_j >= 1 ? Infinity : 1 / (1 - R2_j);
            VIF.push(vif);
        } catch (e) {
            VIF.push(NaN);
        }
    }
    
    return VIF;
}

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

function transpose(matrix) {
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}

function matrixMultiply(A, B) {
    const result = [];
    for (let i = 0; i < A.length; i++) {
        result[i] = [];
        for (let j = 0; j < B[0].length; j++) {
            let sum = 0;
            for (let k = 0; k < A[0].length; k++) {
                sum += A[i][k] * B[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function matrixInverse(matrix) {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => [
        ...row,
        ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    ]);
    
    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                maxRow = k;
            }
        }
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
        
        // Make diagonal 1
        const divisor = augmented[i][i];
        if (Math.abs(divisor) < 1e-10) {
            throw new Error('Matrix is singular or near-singular');
        }
        
        for (let j = 0; j < 2 * n; j++) {
            augmented[i][j] /= divisor;
        }
        
        // Eliminate column
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = augmented[k][i];
                for (let j = 0; j < 2 * n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }
    
    return augmented.map(row => row.slice(n));
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

function tCDF(t, df) {
    // Approximation of Student's t CDF
    const x = df / (df + t * t);
    return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function tInverse(p, df) {
    // Approximation of t critical value
    // Uses Newton-Raphson method for better accuracy
    let t = 2; // Initial guess
    for (let i = 0; i < 10; i++) {
        const cdf = tCDF(t, df);
        const pdf = Math.pow(1 + t * t / df, -(df + 1) / 2);
        t = t - (cdf - (1 - p)) / pdf;
    }
    return Math.abs(t);
}

function fCDF(f, df1, df2) {
    // Approximation of F CDF
    const x = df2 / (df2 + df1 * f);
    return 1 - incompleteBeta(df2 / 2, df1 / 2, x);
}

function incompleteBeta(a, b, x) {
    // Simple approximation of incomplete beta function
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    // Use continued fraction approximation
    const EPSILON = 1e-10;
    const MAXITER = 100;
    
    let result = Math.exp(
        a * Math.log(x) + 
        b * Math.log(1 - x) - 
        logBeta(a, b)
    );
    
    let term = 1;
    let sum = 1;
    
    for (let i = 0; i < MAXITER; i++) {
        term *= (a + i) * x / (a + b + i);
        sum += term;
        if (Math.abs(term) < EPSILON) break;
    }
    
    return result * sum / a;
}

function logBeta(a, b) {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(z) {
    // Stirling's approximation
    if (z < 1) return logGamma(z + 1) - Math.log(z);
    return (z - 0.5) * Math.log(z) - z + 0.5 * Math.log(2 * Math.PI);
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        computeOLS,
        computeVIF,
        transpose,
        matrixMultiply,
        matrixInverse
    };
}

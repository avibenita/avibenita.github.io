/**
 * Hypothesis Testing Engine - Pure JavaScript Implementation
 * Performs bootstrap and classical hypothesis tests without VB6 dependency
 */

class HypothesisTesting {
    
    // ==========================================
    // BASIC STATISTICAL FUNCTIONS
    // ==========================================
    
    /**
     * Calculate mean of array
     */
    static mean(data) {
        if (!data || data.length === 0) return 0;
        return data.reduce((sum, x) => sum + x, 0) / data.length;
    }
    
    /**
     * Calculate median of array
     */
    static median(data) {
        if (!data || data.length === 0) return 0;
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
    }
    
    /**
     * Calculate variance of array
     */
    static variance(data) {
        if (!data || data.length === 0) return 0;
        const m = this.mean(data);
        return data.reduce((sum, x) => sum + (x - m) ** 2, 0) / (data.length - 1);
    }
    
    /**
     * Calculate standard deviation
     */
    static std(data) {
        return Math.sqrt(this.variance(data));
    }
    
    /**
     * Calculate percentile using linear interpolation (Excel PERCENTILE.INC / R quantile type 7)
     */
    static percentile(data, p) {
        if (!data || data.length === 0) return 0;
        if (data.length === 1) return data[0];
        
        const sorted = [...data].sort((a, b) => a - b);
        const index = p * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        if (lower === upper) {
            return sorted[lower];
        }
        
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    
    // ==========================================
    // BOOTSTRAP RESAMPLING
    // ==========================================
    
    /**
     * Resample array with replacement
     */
    static resampleWithReplacement(data) {
        const n = data.length;
        const sample = [];
        for (let i = 0; i < n; i++) {
            const randomIndex = Math.floor(Math.random() * n);
            sample.push(data[randomIndex]);
        }
        return sample;
    }
    
    // ==========================================
    // BOOTSTRAP HYPOTHESIS TESTS
    // ==========================================
    
    /**
     * Bootstrap Mean Test
     * @param {Array} data - Original data
     * @param {Number} h0 - Null hypothesis value
     * @param {Number} iterations - Number of bootstrap iterations
     * @param {Number} orientation - 0: left-tailed, 1: right-tailed, 2: two-tailed
     * @returns {Object} Test results
     */
    static bootstrapMeanTest(data, h0, iterations = 1000, orientation = 2) {
        console.log('🎯 Bootstrap Mean Test:', { h0, iterations, orientation, n: data.length });
        
        const observedMean = this.mean(data);
        const shift = h0 - observedMean;
        
        console.log('  → Observed mean:', observedMean);
        console.log('  → Shift to H0:', shift);
        
        // ✅ Shift data to center at H0 (simulates null hypothesis)
        const shiftedData = data.map(x => x + shift);
        
        // Generate bootstrap distribution
        const bootstrapMeans = [];
        for (let i = 0; i < iterations; i++) {
            const sample = this.resampleWithReplacement(shiftedData);
            bootstrapMeans.push(this.mean(sample));
        }
        
        // Calculate p-value
        const pValue = this.calculatePValue(
            bootstrapMeans, 
            observedMean, 
            h0, 
            orientation
        );
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: 'Mean',
            testName: 'Bootstrap Mean Test',
            testStatistic: observedMean,
            pValue,
            observedValue: observedMean,
            h0,
            orientation: this.getOrientationText(orientation),
            bootstrapMeans
        };
    }
    
    /**
     * Bootstrap Median Test
     */
    static bootstrapMedianTest(data, h0, iterations = 1000, orientation = 2) {
        console.log('🎯 Bootstrap Median Test:', { h0, iterations, orientation, n: data.length });
        
        const observedMedian = this.median(data);
        const shift = h0 - observedMedian;
        
        console.log('  → Observed median:', observedMedian);
        console.log('  → Shift to H0:', shift);
        
        // Shift data to center at H0
        const shiftedData = data.map(x => x + shift);
        
        // Generate bootstrap distribution
        const bootstrapMedians = [];
        for (let i = 0; i < iterations; i++) {
            const sample = this.resampleWithReplacement(shiftedData);
            bootstrapMedians.push(this.median(sample));
        }
        
        // Calculate p-value
        const pValue = this.calculatePValue(
            bootstrapMedians, 
            observedMedian, 
            h0, 
            orientation
        );
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: 'Median',
            testName: 'Bootstrap Median Test',
            testStatistic: observedMedian,
            pValue,
            observedValue: observedMedian,
            h0,
            orientation: this.getOrientationText(orientation),
            bootstrapMedians
        };
    }
    
    /**
     * Bootstrap Variance Test
     */
    static bootstrapVarianceTest(data, h0, iterations = 1000, orientation = 2) {
        console.log('🎯 Bootstrap Variance Test:', { h0, iterations, orientation, n: data.length });
        
        if (h0 <= 0) {
            throw new Error('H₀ variance must be positive');
        }
        
        const observedVariance = this.variance(data);
        const observedStd = Math.sqrt(observedVariance);
        const targetStd = Math.sqrt(h0);
        const scale = targetStd / observedStd;
        
        console.log('  → Observed variance:', observedVariance);
        console.log('  → Scale factor:', scale);
        
        // Scale data to have variance = h0
        const dataMean = this.mean(data);
        const scaledData = data.map(x => (x - dataMean) * scale + dataMean);
        
        // Generate bootstrap distribution
        const bootstrapVariances = [];
        for (let i = 0; i < iterations; i++) {
            const sample = this.resampleWithReplacement(scaledData);
            bootstrapVariances.push(this.variance(sample));
        }
        
        // Calculate p-value
        const pValue = this.calculatePValue(
            bootstrapVariances, 
            observedVariance, 
            h0, 
            orientation
        );
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: 'Variance',
            testName: 'Bootstrap Variance Test',
            testStatistic: observedVariance,
            pValue,
            observedValue: observedVariance,
            h0,
            orientation: this.getOrientationText(orientation),
            bootstrapVariances
        };
    }
    
    /**
     * Bootstrap Percentile Test
     */
    static bootstrapPercentileTest(data, h0, percentileValue, iterations = 1000, orientation = 2) {
        console.log('🎯 Bootstrap Percentile Test:', { h0, percentileValue, iterations, orientation, n: data.length });
        
        const p = percentileValue / 100;
        const observedPercentile = this.percentile(data, p);
        const shift = h0 - observedPercentile;
        
        console.log('  → Observed percentile:', observedPercentile);
        console.log('  → Shift to H0:', shift);
        
        // Shift data to center percentile at H0
        const shiftedData = data.map(x => x + shift);
        
        // Generate bootstrap distribution
        const bootstrapPercentiles = [];
        for (let i = 0; i < iterations; i++) {
            const sample = this.resampleWithReplacement(shiftedData);
            bootstrapPercentiles.push(this.percentile(sample, p));
        }
        
        // Calculate p-value
        const pValue = this.calculatePValue(
            bootstrapPercentiles, 
            observedPercentile, 
            h0, 
            orientation
        );
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: `${percentileValue}th Percentile`,
            testName: 'Bootstrap Percentile Test',
            testStatistic: observedPercentile,
            pValue,
            observedValue: observedPercentile,
            h0,
            orientation: this.getOrientationText(orientation),
            bootstrapPercentiles
        };
    }
    
    /**
     * Calculate p-value from bootstrap distribution
     * ✅ CORRECTED: No "1 -" at the end, compares to H0 not observedValue
     */
    static calculatePValue(bootstrapValues, observedValue, h0, orientation) {
        let numExtremes = 0;
        const n = bootstrapValues.length;
        
        for (const bootValue of bootstrapValues) {
            if (orientation === 2) {
                // Two-tailed: compare distance from H0
                if (Math.abs(bootValue - h0) >= Math.abs(observedValue - h0)) {
                    numExtremes++;
                }
            } else if (orientation === 0) {
                // Left-tailed (H1: parameter < H0)
                if (bootValue <= observedValue) {
                    numExtremes++;
                }
            } else if (orientation === 1) {
                // Right-tailed (H1: parameter > H0)
                if (bootValue >= observedValue) {
                    numExtremes++;
                }
            }
        }
        
        // ✅ P-value is the proportion of extremes (NO "1 -")
        return numExtremes / n;
    }
    
    // ==========================================
    // CLASSICAL HYPOTHESIS TESTS
    // ==========================================
    
    /**
     * One-sample t-test
     */
    static tTest(data, h0, orientation = 2) {
        console.log('🎯 Classical t-Test:', { h0, orientation, n: data.length });
        
        const n = data.length;
        const mean = this.mean(data);
        const std = this.std(data);
        const se = std / Math.sqrt(n);
        const tStat = (mean - h0) / se;
        const df = n - 1;
        
        console.log('  → Mean:', mean);
        console.log('  → Std:', std);
        console.log('  → t-statistic:', tStat);
        console.log('  → df:', df);
        
        // Calculate p-value using t-distribution
        const pValue = this.tTestPValue(tStat, df, orientation);
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: 'Mean',
            testName: 'One-Sample t-Test',
            testStatistic: tStat,
            pValue,
            observedValue: mean,
            h0,
            orientation: this.getOrientationText(orientation),
            df,
            standardError: se
        };
    }
    
    /**
     * Calculate p-value for t-test using approximation
     */
    static tTestPValue(t, df, orientation) {
        // For large df (>30), t-distribution ≈ normal distribution
        if (df > 30) {
            return this.normalPValue(t, orientation);
        }
        
        // For smaller df, use a reasonable approximation
        // This is a simplified approach - for production, use a proper t-distribution library
        const absT = Math.abs(t);
        
        // Approximate using normal distribution with adjustment
        const adjustment = 1 + (1 / (4 * df));
        const adjustedT = absT / adjustment;
        
        return this.normalPValue(adjustedT, orientation);
    }
    
    /**
     * Calculate p-value for normal distribution
     */
    static normalPValue(z, orientation) {
        if (orientation === 2) {
            // Two-tailed: P(|Z| > |z|)
            const absZ = Math.abs(z);
            const oneTailP = 1 - this.normalCDF(absZ);
            return 2 * oneTailP;
        } else if (orientation === 0) {
            // Left-tailed: P(Z ≤ z)
            return this.normalCDF(z);
        } else {
            // Right-tailed: P(Z ≥ z)
            return 1 - this.normalCDF(z);
        }
    }
    
    /**
     * Standard normal CDF (cumulative distribution function)
     * Using Abramowitz and Stegun approximation
     */
    static normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - prob : prob;
    }
    
    /**
     * Chi-square variance test
     */
    static chiSquareVarianceTest(data, h0, orientation = 2) {
        console.log('🎯 Chi-Square Variance Test:', { h0, orientation, n: data.length });
        
        if (h0 <= 0) {
            throw new Error('H₀ variance must be positive');
        }
        
        const n = data.length;
        const sampleVariance = this.variance(data);
        const chiSquare = ((n - 1) * sampleVariance) / h0;
        const df = n - 1;
        
        console.log('  → Sample variance:', sampleVariance);
        console.log('  → Chi-square statistic:', chiSquare);
        console.log('  → df:', df);
        
        // Approximate p-value
        // For a proper implementation, use a chi-square CDF library
        const pValue = this.chiSquarePValue(chiSquare, df, orientation);
        
        console.log('  → P-value:', pValue);
        
        return {
            testParameter: 'Variance',
            testName: 'Chi-Square Variance Test',
            testStatistic: chiSquare,
            pValue,
            observedValue: sampleVariance,
            h0,
            orientation: this.getOrientationText(orientation),
            df
        };
    }
    
    /**
     * Approximate chi-square p-value
     * Using Wilson-Hilferty transformation to approximate as normal
     */
    static chiSquarePValue(chiSq, df, orientation) {
        // Wilson-Hilferty transformation
        const z = (Math.pow(chiSq / df, 1/3) - (1 - 2/(9*df))) / Math.sqrt(2/(9*df));
        
        return this.normalPValue(z, orientation);
    }
    
    // ==========================================
    // CRITICAL VALUES
    // ==========================================
    
    /**
     * Chi-square inverse CDF (approximation using Wilson-Hilferty transformation)
     */
    static inverseChiSquareCDF(p, df) {
        if (p <= 0 || p >= 1 || df <= 0) return NaN;
        
        // Wilson-Hilferty transformation: χ² ≈ df(1 - 2/(9df) + z√(2/(9df)))³
        const z = this.inverseNormalCDF(p);
        const term1 = 1 - 2 / (9 * df);
        const term2 = z * Math.sqrt(2 / (9 * df));
        const chiSq = df * Math.pow(term1 + term2, 3);
        
        return Math.max(0, chiSq); // Chi-square values cannot be negative
    }
    
    /**
     * Calculate critical values for hypothesis test
     * Uses appropriate distribution based on test type
     */
    static calculateCriticalValues(alpha, orientation, testName = '', sampleSize = 0) {
        const result = { left: null, right: null };
        
        if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
            return result;
        }
        
        // Determine if this is a chi-square test
        const testNameLower = (testName || '').toLowerCase();
        const isChiSquareTest = testNameLower.includes('chi-square') || 
                                testNameLower.includes('chi square') ||
                                (testNameLower.includes('variance') && !testNameLower.includes('bootstrap'));
        
        // For chi-square tests, use chi-square distribution
        if (isChiSquareTest && sampleSize > 1) {
            const df = sampleSize - 1;
            
            if (orientation === 2) {
                // Two-tailed
                result.left = this.inverseChiSquareCDF(alpha / 2, df);
                result.right = this.inverseChiSquareCDF(1 - alpha / 2, df);
            } else if (orientation === 0) {
                // Left-tailed
                result.left = this.inverseChiSquareCDF(alpha, df);
            } else if (orientation === 1) {
                // Right-tailed
                result.right = this.inverseChiSquareCDF(1 - alpha, df);
            }
        } else {
            // For other tests, use normal distribution (Z-scores)
            if (orientation === 2) {
                // Two-tailed
                result.left = this.inverseNormalCDF(alpha / 2);
                result.right = this.inverseNormalCDF(1 - alpha / 2);
            } else if (orientation === 0) {
                // Left-tailed
                result.left = this.inverseNormalCDF(alpha);
            } else if (orientation === 1) {
                // Right-tailed
                result.right = this.inverseNormalCDF(1 - alpha);
            }
        }
        
        return result;
    }
    
    /**
     * Inverse normal CDF using Acklam's algorithm
     */
    static inverseNormalCDF(p) {
        if (p <= 0) return -Infinity;
        if (p >= 1) return Infinity;
        
        const a = [
            -39.6968302866538,
            220.946098424521,
            -275.928510446969,
            138.357751867269,
            -30.6647980661472,
            2.50662827745924
        ];
        const b = [
            -54.4760987982241,
            161.585836858041,
            -155.698979859887,
            66.8013118877197,
            -13.2806815528857
        ];
        const c = [
            -0.00778489400243029,
            -0.322396458041136,
            -2.40075827716184,
            -2.54973253934373,
            4.37466414146497,
            2.93816398269878
        ];
        const d = [
            0.00778469570904146,
            0.32246712907004,
            2.445134137143,
            3.75440866190742
        ];
        
        const plow = 0.02425;
        const phigh = 1 - plow;
        let q, r;
        
        if (p < plow) {
            q = Math.sqrt(-2 * Math.log(p));
            return ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
                /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        }
        
        if (p > phigh) {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
                /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        }
        
        q = p - 0.5;
        r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
            /
            (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    
    // ==========================================
    // MAIN TEST RUNNER
    // ==========================================
    
    /**
     * Run hypothesis test based on configuration
     * @param {Object} config - Test configuration
     * @param {Array} data - Sample data
     * @returns {Object} Test results
     */
    static runTest(config, data) {
        console.log('🚀 Running hypothesis test:', config);
        
        // Validate inputs
        if (!data || data.length === 0) {
            throw new Error('No data provided');
        }
        
        const method = config.method || 'classical';
        const parameter = config.parameter || 'Mean';
        const h0 = parseFloat(config.h0Value);
        const orientationText = config.orientation || 'two-sided';
        const iterations = parseInt(config.iterations) || 1000;
        const percentileValue = parseInt(config.percentileValue);
        const alpha = parseFloat(config.alpha) || 0.05;
        
        // Convert orientation text to number
        let orientation = 2; // default two-tailed
        if (orientationText.includes('left') || orientationText === 'left' || orientationText.includes('<')) {
            orientation = 0;
        } else if (orientationText.includes('right') || orientationText === 'right' || orientationText.includes('>')) {
            orientation = 1;
        }
        
        console.log('  → Method:', method);
        console.log('  → Parameter:', parameter);
        console.log('  → H0:', h0);
        console.log('  → Orientation:', orientation, '(' + orientationText + ')');
        console.log('  → Alpha:', alpha);
        console.log('  → Sample size:', data.length);
        
        let result;
        
        // Run appropriate test
        if (method === 'bootstrap') {
            console.log('  → Running bootstrap test...');
            switch (parameter) {
                case 'Mean':
                    result = this.bootstrapMeanTest(data, h0, iterations, orientation);
                    break;
                case 'Median':
                    result = this.bootstrapMedianTest(data, h0, iterations, orientation);
                    break;
                case 'Variance':
                    result = this.bootstrapVarianceTest(data, h0, iterations, orientation);
                    break;
                case 'Percentile':
                    result = this.bootstrapPercentileTest(data, h0, percentileValue, iterations, orientation);
                    break;
                default:
                    throw new Error('Unknown parameter: ' + parameter);
            }
        } else {
            console.log('  → Running classical test...');
            switch (parameter) {
                case 'Mean':
                    result = this.tTest(data, h0, orientation);
                    break;
                case 'Variance':
                    result = this.chiSquareVarianceTest(data, h0, orientation);
                    break;
                case 'Median':
                case 'Percentile':
                    throw new Error('Classical tests not available for ' + parameter + '. Use bootstrap method.');
                default:
                    throw new Error('Unknown parameter: ' + parameter);
            }
        }
        
        // Add critical values (using correct distribution based on test type)
        const testName = result.testName || '';
        const sampleSize = data.length;
        const criticalValues = this.calculateCriticalValues(alpha, orientation, testName, sampleSize);
        result.critLeft = criticalValues.left;
        result.critRight = criticalValues.right;
        result.alphaH0 = alpha;
        result.sampleSize = sampleSize;
        
        console.log('✅ Test complete:', result);
        
        return result;
    }
    
    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    
    /**
     * Convert orientation number to text
     */
    static getOrientationText(orientation) {
        switch (orientation) {
            case 0: return 'Left-tailed';
            case 1: return 'Right-tailed';
            case 2: return 'Two-tailed';
            default: return 'Two-tailed';
        }
    }
    
    /**
     * Format test results for display
     */
    static formatResults(results) {
        return {
            testParameter: results.testParameter,
            testName: results.testName,
            testOrientation: results.orientation,
            testStatisticH0: results.testStatistic,
            pValueH0: results.pValue,
            critLeft: results.critLeft,
            critRight: results.critRight,
            alphaH0: results.alphaH0,
            sampleSize: results.sampleSize,
            // ✅ Include data for effect size calculation
            observedValue: results.observedValue,
            h0Value: results.h0,
            standardError: results.standardError,
            df: results.df,
            // ✅ Preserve bootstrap samples for visualization
            bootstrapMeans: results.bootstrapMeans,
            bootstrapMedians: results.bootstrapMedians,
            bootstrapVariances: results.bootstrapVariances,
            bootstrapPercentiles: results.bootstrapPercentiles
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.HypothesisTesting = HypothesisTesting;
    console.log('✅ Hypothesis Testing Engine loaded');
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HypothesisTesting;
}


# Univariate review r007

Picture and spoken lines come from univariate__capcut__v001-vo7.mp4. The added picture is the skewed PP comparison and the power recalculation from 80% to 90%. Both sample-size callouts stay on screen. r006 is unchanged.

| Start | End | Line |
| --- | --- | --- |
| 0:00.45 | 0:04.79 | Univariate, one variable, every view that matters. |
| 0:08.15 | 0:14.08 | Change the bins, or the range. The chart and the statistics update. |
| 0:16.95 | 0:18.82 | Outliers. |
| 0:20.00 | 0:23.94 | The lower plot drops values beyond the fences. |
| 0:27.20 | 0:32.46 | I Q R is selected. Red points are the outliers. |
| 0:32.58 | 0:34.64 | Kernel density. |
| 0:35.25 | 0:39.93 | Kernel density draws a smooth curve through the same observations. |
| 0:41.65 | 0:45.83 | A smaller bandwidth multiplier redraws that curve. |
| 0:51.05 | 0:53.57 | Q Q and P P. |
| 0:54.05 | 0:57.60 | The Q Q plot uses a normal reference. |
| 0:57.80 | 1:02.26 | The lower plot is the detrended residual from the reference line. |
| 1:02.38 | 1:05.36 | Distribution sets the reference. |
| 1:05.75 | 1:09.97 | The PP plot compares cumulative probabilities. |
| 1:10.13 | 1:14.95 | Here, the curved pattern shows a mismatch with the normal reference. |
| 1:16.00 | 1:20.66 | Now compare the same observations with a lognormal reference. |
| 1:26.45 | 1:28.39 | Normality. |
| 1:28.51 | 1:33.00 | Normality is assessed from six different normality tests. |
| 1:34.75 | 1:48.43 | The gauge is the normality strength index, a combined proprietary index from those six tests. It shows how strongly the sample tends toward normality. Here it reads 66. |
| 1:52.55 | 1:54.85 | Confidence interval. |
| 1:54.97 | 2:04.21 | Classical and bootstrap are offered. Bootstrap is for a parameter with no closed analytical solution, such as the median. |
| 2:04.35 | 2:10.11 | The margin of error increases from 6.5 to 8.6 horsepower. |
| 2:16.45 | 2:24.99 | Bootstrap estimates uncertainty by repeatedly resampling the observations. Here, we use it for the median. |
| 2:32.65 | 2:35.03 | Hypothesis test. |
| 2:35.15 | 2:40.77 | First, run the test. The null mean is 200 horsepower. |
| 2:40.89 | 2:43.41 | Run the Test is clicked. |
| 2:43.53 | 2:45.71 | Fail to reject. |
| 2:46.80 | 2:49.18 | Visualize is clicked. |
| 2:49.65 | 2:53.95 | Yellow marks the statistic, and red marks rejection. |
| 2:56.45 | 3:00.58 | Now test a mean of 185 horsepower. |
| 3:00.72 | 3:04.90 | This time, the result is statistically significant. |
| 3:05.55 | 3:09.70 | Use power analysis to plan how much data you need. |
| 3:09.84 | 3:17.71 | For this assumed effect, about 15 horsepower, choose 80% power at a 5% significance level. |
| 3:17.85 | 3:21.91 | The required sample size is 139. |
| 3:22.40 | 3:25.64 | Increase the target to 90%. |
| 3:25.76 | 3:29.86 | The required sample size is 185. |
| 3:30.00 | 3:33.38 | Greater power requires a larger sample. |

Duration 3:41.54. Power assumptions: one-sample two-sided t-test, alpha 0.05, Cohen's d 0.2402 from the test of a mean of 185 horsepower against the Horsepower sample (mean 200.3493, about 15 horsepower). Required n is 139 at 80% power and 185 at 90% power. The PP comparison uses a seeded lognormal sample, n = 369, labeled “Skewed example · simulated data,” first against a normal reference and then against a lognormal reference. The lognormal plot is the recalculated reference for the same points; the narration does not claim the reference is correct.

# Regression video run 20261105-090836-ea50d4

Status: FAILED
Recommended candidate: none

Automated readiness is not publication approval. Watch and listen to the recommended candidate, then decide any CapCut export yourself. This run does not write the approved folder and does not replace website assets.

## What changed
No source revision was applied.

## Required issues still open
None recorded by the last accepted review.

## Unassessed checks
- Overview frames are a bounded sample, not a complete motion review. Unsampled intervals are listed with the evidence.
- Blank results and cropped labels are not measured by a local pixel oracle. They are visible to the vision review when that review runs, and they remain unassessed when it does not.
- A transcript does not prove voice naturalness, pronunciation, absence of music or noise, or pleasant transitions. Those stay on the human listening and motion pass.
- Script cue times are placement times, not measured word timings, unless a timestamped transcript of the rendered audio is attached.

## Validation
Regression production check passed for demo seed 20260812.
This check does not sign off the module as independently validated.
Outstanding findings: Statistico/validation/regression/FINDINGS.md
Limitation: Overview F-test chip shows "0.0001" while the conclusion text is below 0.0001. Deferred to the validation project. Not featured.
Limitation: Scenario region control opens on West while the linear predictor uses the North reference. Deferred. The film does not use the region control.
Limitation: Shapiro-Wilk and Breusch-Pagan cards are random draws. An outside Shapiro-Wilk on these residuals is W 0.9881, p 0.3828. Deferred. Not featured.
Limitation: Durbin-Watson on the page drops the first squared residual. The outside statistic is 1.7124. Deferred. Not featured.
Limitation: Cook's distance on screen uses leverage k/n for every row (page maximum about 0.0676). Classical hat-value Cook's distance has maximum 0.1186. Deferred. The film uses the flagged rows and the refit, and does not describe Cook's distance.
Limitation: Scenario interval widths use 0.3×RMSE and 1.1×RMSE with t = 1.96. They are not classical standard errors. Deferred. The film does not describe those widths.

## Candidates

## What to view and listen to
There is no candidate to approve.

Stopped: Recording failed.
Error: Refit comparison did not appear:  Model Comparison
 Restore Original
ORIGINAL MODEL (N=120)
R²: 0.6563
Adj R²: 0.6444
RMSE: 19.3062
→
REFITTED MODEL (N=117)
R²: 0.6930
Adj R²: 0.6821
RMSE: 17.8640
    at influence (file:///E:/OneDrive/GitHub/Statistico/regression/produce/capture.mjs:187:11)
    at async recordScene (file:///E:/OneDrive/GitHub/Statistico/regression/produce/capture.mjs:258:5)
    at async main (file:///E:/OneDrive/GitHub/Statistico/regression/produce/capture.mjs:311:19)


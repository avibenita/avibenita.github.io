# Regression video run 20261105-072523-0954ba

Status: READY_FOR_HUMAN_REVIEW
Recommended candidate: E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-072523-0954ba\candidates\v1.mp4

Automated readiness is not publication approval. Watch and listen to the recommended candidate, then decide any CapCut export yourself. This run does not write the approved folder and does not replace website assets.

## What changed
No source revision was applied.

## Required issues still open
None recorded by the last accepted review.

## Unassessed checks
- Sampling cannot confirm overlay animation timings (250ms fade-in, 1.2s pulse, 200ms fade-out); review highlight log or full playback for exact animation.
- Human review is still required for: naturalness and pleasantness of narration, pronunciation, background noise or music absence, smoothness of transitions, and CapCut signoff.
- Not all frames were reviewed; all findings are based on collected frames, logs, and transcripts only.
- Camera motion and scene pacing are not fully assessed without continuous playback.
- Overview frames are a bounded sample, not a complete motion review. Unsampled intervals are listed with the evidence.
- Blank results and cropped labels are not measured by a local pixel oracle. They are visible to the vision review when that review runs, and they remain unassessed when it does not.
- A transcript does not prove voice naturalness, pronunciation, absence of music or noise, or pleasant transitions. Those stay on the human listening and motion pass.
- Script cue times are placement times, not measured word timings, unless a timestamped transcript of the rendered audio is attached.

## Validation
Regression numerical contract passed for demo seed 20260812.
Limitation: The overview F-test chip shows "0.0001" while the conclusion and the independent tail probability are below 0.0001. The film quotes the conclusion, not the chip.
Limitation: The scenario dropdown opens on West, but its dummy coding drops the first encountered level. The displayed level matches the North reference linear predictor. The film states the on-screen change, which matches the Ad Spend slope, and does not attribute that level to the West coefficient.
Limitation: Shapiro-Wilk and Breusch-Pagan on the diagnostics overview are random draws in the page, not a reproducible test. An independent Shapiro-Wilk on these residuals is W 0.9881, p 0.3828. The film uses the residual plots and does not quote those cards.
Limitation: Durbin-Watson in the page drops the first squared residual. The independent statistic is 1.7124. The film does not quote it.
Limitation: Cook's distance on screen uses leverage k/n for every row (page maximum about 0.0676). Classical hat-value Cook's distance has maximum 0.1186. The narration says the screen's calculation stays under 0.5.
Limitation: Scenario interval widths use 0.3×RMSE and 1.1×RMSE with t = 1.96. They are not classical mean and prediction standard errors. The film follows the moving prediction, not those widths.

## Candidates
- v1: E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-072523-0954ba\candidates\v1.mp4

## What to view and listen to
Open E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-072523-0954ba\candidates\v1.mp4. Check the picture, the narration, and the closing. Confirm the on-screen results against the numerical validation in this report.

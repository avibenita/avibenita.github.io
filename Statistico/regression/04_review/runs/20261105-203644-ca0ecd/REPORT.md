# Regression video run 20261105-203644-ca0ecd

Status: READY_FOR_HUMAN_REVIEW
Recommended candidate: E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-203644-ca0ecd\candidates\v1.mp4

Automated readiness is not publication approval. Watch and listen to the recommended candidate, then decide any CapCut export yourself. This run does not write the approved folder and does not replace website assets.

## What changed
No source revision was applied.

## Required issues still open
None recorded by the last accepted review.

## Unassessed checks
- Sampling alone cannot conclusively verify the 300ms gold frame draw-in, 2.4s breathing cycle, or 200ms fade-out—relies on log and overlay constants, not direct full-motion evidence.
- Complete motion review (transitions, pacing, animation continuity) is not possible from frame or transcript subsampling.
- Voice naturalness, pronunciation, presence/absence of background noise/music, and subjective narration or transition quality are unassessed—require human review.
- Visible catalogue cards and content are not independently OCR-verified, only visually sampled for presence and structure.
- Overview frames are a bounded sample, not a complete motion review. Unsampled intervals are listed with the evidence.
- Blank results and cropped labels are not measured by a local pixel oracle. They are visible to the vision review when that review runs, and they remain unassessed when it does not.
- A transcript does not prove voice naturalness, pronunciation, absence of music or noise, or pleasant transitions. Those stay on the human listening and motion pass.
- Script cue times are placement times, not measured word timings, unless a timestamped transcript of the rendered audio is attached.

## Production check
Regression production check passed for demo seed 20260812.
This check does not sign off the module as independently validated.
Outstanding findings: Statistico/validation/regression/FINDINGS.md
Limitation: Overview F-test chip shows "0.0001" while the conclusion text is below 0.0001. Deferred to the validation project. Not featured.
Limitation: Shapiro-Wilk and Breusch-Pagan cards are random draws. An outside Shapiro-Wilk on these residuals is W 0.9881, p 0.3828. Deferred. Not featured.
Limitation: Durbin-Watson on the page drops the first squared residual. The outside statistic is 1.7124. Deferred. Not featured.
Limitation: Cook's distance on screen uses leverage k/n for every row (page maximum about 0.0676). Classical hat-value Cook's distance has maximum 0.1186. Deferred. The film uses the flagged rows and the refit, and does not describe Cook's distance.
Limitation: Scenario interval widths use 0.3×RMSE and 1.1×RMSE with t = 1.96. They are not classical standard errors. Deferred. The film does not describe those widths.

## Candidates
- v1: E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-203644-ca0ecd\candidates\v1.mp4

## What to view and listen to
Open E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-203644-ca0ecd\candidates\v1.mp4. Check the picture, the narration, and the closing. The production check confirms the featured actions. It is not a validation sign-off.

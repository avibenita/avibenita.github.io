# Regression video run 20261105-201926-3d7197

Status: blocked
Recommended candidate: none

Automated readiness is not publication approval. Watch and listen to the recommended candidate, then decide any CapCut export yourself. This run does not write the approved folder and does not replace website assets.

## What changed
- Round 2: Fully unattended edits are blocked on this Windows machine. No OS sandbox was available for the Cursor agent. The controller asks for a patch and applies it only when every path is inside the permitted video folders. A prompt is not treated as a write sandbox. The agent is not started with --force against the production tree, and it is not given the OpenAI key.

## Required issues still open
- silence-catalogue: Extended, unexplained silence (~30s) during the catalogue scene; no required narration present, and no silent card indicator. Change: Add the required narration introducing the Regression feature catalogue (e.g., “These demonstrations are part of a broader regression toolkit”), leave enough time for reading all catalogue items, and ensure no long unexplained silence remains. If silence is intentional (not standard for Regression), visually indicate this for the user.
- TECH-1-1: Unexpected silence in catalogue, which is not an intentional silent card. Change: Correct the measured technical failure without inventing statistical results.

## Unassessed checks
- Sampling alone cannot verify overlay animation timings (300ms draw, 2.4s breathe, 200ms fade); confirmation relies on logs and encoded settings.
- Sampling of transcript or frames cannot fully assess voiceover naturalness, pronunciation, music/noise absence, or transition polish—human review is required for these checks.
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
- v1: E:\OneDrive\GitHub\Statistico\regression\04_review\runs\20261105-201926-3d7197\candidates\v1.mp4

## What to view and listen to
There is no candidate to approve.

Stopped: Fully unattended edits are blocked on this Windows machine. No OS sandbox was available for the Cursor agent. The controller asks for a patch and applies it only when every path is inside the permitted video folders. A prompt is not treated as a write sandbox. The agent is not started with --force against the production tree, and it is not given the OpenAI key.

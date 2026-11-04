# Contingency review QA r001

## Render

From `Statistico/contingency/produce`, with `imageio-ffmpeg` available:

```
py -3 speak.py cues.json ../03_audio
node capture.mjs
node assemble.mjs
```

`capture.mjs` serves the repo on 127.0.0.1:8765 and records the live results page. `assemble.mjs` trims, crossfades the cards, loudness-normalizes the narration, and writes the two MP4s.

## Outputs

- `04_review/contingency__film__review-r001.mp4` — 32.3 MB, 1728×1080, 30 fps, H.264 High, AAC 48 kHz stereo, 4:05.07, faststart.
- `04_review/contingency__capabilities_two_cards__r001.mp4` — 4.5 MB, silent, 44.8 s.
- Narration stem after loudnorm: integrated −16.7 LUFS, true peak −1.5 dBFS.

The review is longer than the 3:15–3:30 aim. Speech was left at Aria −4%. Section changes use a short navy light-sweep, and the picture eases in on the menu, table, measures, residuals, and chart. CapCut can shorten the silent holds.

## Reference checks

Engine test `film fixtures match the programme, satisfaction, and sparse reference values` passed. The film capture rechecked the same bundle before each chapter.

Example A, 120 individual rows, no frequency column:

- Counts 42, 18, 30, 30. Row percentages 70% and 50%, with the counts kept as the smaller number.
- Expected counts 36 and 24.
- Pearson χ² = 5, df = 1, p = 0.025347. Uncorrected. No Yates control exists on this page.
- Programme A, event Completed: risk ratio 1.40 (95% CI 1.025–1.894), odds ratio 2.33 (1.103–4.935), risk difference +20.0 points (2.8–37.2). Intervals match the engine’s log-Wald ratio formulas and Wald difference, using `zCrit(0.95)`. No continuity correction.
- Programme B, same event: risk ratio 0.71, odds ratio 0.43, risk difference −20.0 points. Programme A is restored before the next scene.

Example B, 180 individual rows:

- Every expected count is 20. Pearson χ² = 18, df = 4. The overview prints p as 0.001 and Cramér’s V as 0.224. The engine values are p = 0.001234 and V = 0.223607. V is the ordinary uncorrected formula, not a bias-corrected one.
- High satisfaction is 20%, 30%, and 50% of Basic, Standard, and Premium.
- Adjusted residual at Basic/Low is 3.35 on screen (3.354). Basic/High is −2.68 (−2.683). Premium/High is 3.35. The 2×2 menu is absent.
- 100% stacked columns use row % , Segment on the x-axis, and satisfaction in the legend. Basic is 50/30/20 and Premium is 20/30/50.

Sparse 2×2, 10 rows, all expected counts 2.5. The warning is on screen. Fisher’s exact p prints as 0.206 (engine 0.206349). The narration does not read the p-value.

## Frame check

Frames at 1.2 s, 50 s, 78 s, 103 s, 120 s, 160 s, 175 s, 195 s, 220 s, and 231 s show the opening, the 70/50 row-percent table, the 2×2 view, Programme B’s reversed measures, the N = 180 overview, the stacked chart with its columns drawn, the Fisher row, both capability cards, and the close. Cards from 3:02 to 3:47 have no narration clip.

## Playback limits

Pronunciation was not checked by ear. The script spells “chi-square”, “Cramer's V”, “Fisher's”, and “odds ratio” for Aria. Highlight rings and the two takeaway lines are capture overlays on the real controls, not part of the product UI. Highcharts column animation is turned off only inside the recording browser so the stacked columns finish drawing before the shot.

## Product changes made for the recording

- `?demo=1&example=` loads a named sample through `analyze`. The default demo is unchanged and does not show the film titles.
- The first selected table measure is now the large number. Previously the large number followed the fixed measure list, which disagreed with the on-screen help.
- After a 2×2 remap, `window.__contingencyResult` is updated, so Analyze all results sees the current group and event.
- The demo “Back to Analytics” link waits for the sidebar instead of becoming a flex child that pushed the module to the bottom half of the window.

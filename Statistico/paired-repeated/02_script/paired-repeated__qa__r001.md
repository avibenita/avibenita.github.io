# Paired Means QA r001

## Render

```
py -3 Statistico/paired-repeated/01_source/make_fixture.py
py -3 Statistico/paired-repeated/produce/speak.py Statistico/paired-repeated/produce/cues.json Statistico/paired-repeated/03_audio
node Statistico/paired-repeated/produce/capture.mjs
node Statistico/paired-repeated/produce/assemble.mjs
```

`paired-repeated__film__review-r001.mp4`: 3:01.67, 1728×1080, 30 fps, H.264, AAC stereo 48 kHz, faststart, 23.0 MB.

`paired-repeated__capabilities_two_cards__r001.mp4`: 42.73 s, silent.

Narration after loudness normalisation: −16.7 LUFS, peak −1.5 dBFS.

Playback frames checked: opening card, the navy sweep, the enlarged menu and the complete-pair table, the means chart, the mean change 4.00 [0.6219, 7.38], the signed-rank panel, and the logo close.

## Fixture

Seed 110402. Twenty-four people, P01–P24. Before is centered at 60 with sample SD 12. The change scores are centered at 4 with sample SD 8. After = Before + change. Follow-up is stored and not analysed in this film. Eight of the 24 changes are negative.

## What the screen shows, against the reference

Direction on screen: After minus Before.

| Quantity | Screen | Engine | scipy reference |
| --- | --- | --- | --- |
| Mean change | 4.00 | 4.00000004 | 4.00000004 |
| SD of changes | not labeled | 8.00000003 | 8.00000003 |
| Paired t (df) | t(23.00) = 2.45 | 2.44948976 (23) | 2.44948976 (23) |
| Two-sided p | 0.0223 | 0.02234066 | 0.02234066 |
| 95% interval | [0.6219, 7.38] | [0.62189630, 7.37810379] | [0.62189630, 7.37810379] |
| Cohen dz | not labeled | 0.50000000 | 0.50000000 |
| Hedges g on screen | 0.2860 (small) | 0.28601439 | not dz |
| Wilcoxon | W = 225.00, p 0.0321, r 0.5000 | same | p 0.03212457 |

The screen’s W is the positive rank sum. scipy’s default statistic for the same test is the lesser rank sum, 75. The two-sided asymptotic p-values match. The signed-rank p on screen uses a normal approximation without a continuity correction. Rank-biserial r is (2W+ − n(n+1)/2) / (n(n+1)/2).

## Isolated corrections made so the page could be filmed

- The paired p-value and the 95% interval now use the Student t distribution. The previous p-value was a normal approximation, and the interval fields were empty.
- The decision and the agreement line use the paired p and the signed-rank p.
- Total N on the descriptives header is the complete-pair count. The overall mean remains the mean of the scores, 62.00.
- The written report names the paired t and the signed-rank test.
- Excess kurtosis on the descriptives table uses the unbiased sample formula.
- The dependent menu describes this page as a paired comparison. The power item says it is not calculated here.

## Picture

Section joins use the Contingency sweep: dark field, one cyan beam, one horizontal rule, crossfaded at 0.38 s. Card 1 into card 2 is a 0.6 s crossfade with no sweep. The last 0.7 s fade out.

Focus moves are post-capture. Each ease in and ease back is 0.5 s. The enlargements sit on the chips, the menu, the table, the chart, the mean change and its interval, the t statistic, and the signed-rank panel.

## Omitted on purpose

- Three occasions. The within-subject F on this fixture is 6.72054750 on (2, 46), p 0.00275064, partial eta squared 0.22612462. The p-value attached to that F in the engine is a step function, so the repeated-measures result is not shown. The title of the film is Paired Means.
- Power. The two-occasion panel is a placeholder, and no separate paired-t planner was filmed.
- Individual trajectories. This page does not draw one line per person.
- Hedges g is visible and is not narrated, because it is not the paired standardised effect.
- The two AI actions were not called.

## Limitations

Runtime is 3:02, short of the 3:25–3:50 aim, because the repeated-measures chapter and the power chapter are omitted and the narration was not sped up. The interval is printed as [0.6219, 7.38], four decimals on the lower end and two on the upper; that is the page’s own rounding. The means chart draws an interval around each occasion mean. It is not the interval of the mean change. The histogram note talks about the selected occasion. Highcharts was served from the local vendor during capture.

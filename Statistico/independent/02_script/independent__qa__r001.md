# Independent Means QA r001

## Render

```
node Statistico/independent/produce/capture.mjs
node Statistico/independent/produce/assemble.mjs
```

`independent__film__review-r001.mp4`: 3:49.87, 1728×1080, 30 fps, H.264, AAC stereo 48 kHz, faststart, 33.0 MB.

`independent__capabilities_two_cards__r001.mp4`: 43.53 s, silent.

Narration after loudness normalisation: −16.7 LUFS, peak −1.5 dBFS.

Playback frames checked: opening card, the navy sweep, the enlarged menu and table, the box plot, η² 0.083 with required N 89, η² 0.038 with required N 201, the Mann–Whitney panel, and the logo close.

## Fixture

Seed 110401. Group A mean 65, Group B mean 71, sample SD 10, n = 30 and 30. Scores sit in separate columns with the other cell empty, so the page does not treat a row as a pair.

## What the screen shows, against the reference

| Quantity | Screen | Engine | scipy Welch reference |
| --- | --- | --- | --- |
| Difference, A minus B | −6.00 | −6.000000 | −6.000000 |
| t (df) | t(58.00) = −2.32 | −2.32379 (58) | −2.32379 (58) |
| Two-sided p | 0.0201 | 0.02014, normal approximation | 0.02366, t distribution |
| 95% interval | [−11.06, −0.9394] | [−11.0606, −0.9394], z = 1.959964 | [−11.1684, −0.8316], t critical |
| Hedges g | −0.5922 (medium) | −0.59221 | — |
| Pooled Cohen d | not labeled | −0.60000 | — |
| Mann–Whitney | U = 309.00, p 0.0371, rank-biserial −0.3133 | same | — |

The descriptives table prints standard deviation 9.83. That column divides by n. The test uses the sample standard deviation, 10.

## Picture

Section joins use the Contingency sweep: dark field, one cyan beam, one horizontal rule, crossfaded at 0.38 s. Card 1 into card 2 is a 0.6 s crossfade with no sweep. The last 0.7 s fade out.

Focus moves are post-capture. Each ease in and ease back is 0.5 s, zoom about 1.18 to 1.40, aimed at the chips, the menu, the table, the box plot, the estimate, Hedges g, the planning figures, and the rank result.

## Omitted on purpose

- The significance control does not widen the interval, so that beat is not in the film.
- Student and permutation are not selectable after the page initialises.
- The k-plus page is not opened.
- The two AI actions are on the sidebar and were not called.
- No Cohen’s d field and no per-group sample-size solver. Planning is total N from assumed eta-squared on a noncentral F model.

## Limitations

Runtime is 3:50, past the 3:35 aim, because the narration was not sped up. The upper end of the interval is printed to four decimals (−0.9394) while −11.06 is printed to two; that is the page’s own rounding. The means chart draws the interval of each mean, not the standard deviation. Highcharts was served from the local vendor during capture because the CDN response was blocked in this browser.

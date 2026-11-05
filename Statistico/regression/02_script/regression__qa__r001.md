# Regression QA r001

`node Statistico/video-workflow/validate-regression.mjs` must pass before a recording.

Pass means:

- Page rows equal the seed-20260812 demo worker.
- Coefficients, standard errors, t statistics, 95% limits, R², adjusted R², RMSE, and F match the independent fit within a tight absolute tolerance.
- The Ad Spend row shows 1.76, 0.1264, 13.92, < 0.0001, 1.51, and 2.01.
- The technical F panel shows < 0.0001.
- Raising Ad Spend changes predicted sales by the fitted slope, within 0.03 on the rounded display.
- Flagged rows are 18, 61, and 83.
- The refit panel shows R² 0.6930, RMSE 17.8640, and n 117.

Known limits are printed and do not fail this contract, because correcting them would change the analytical page. The film does not narrate them as confirmed results. The approved folder is not written by the workflow.

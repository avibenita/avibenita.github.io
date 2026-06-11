# Logistic Regression Power Analysis

Python cloud function for logistic regression power and sample-size planning.

## Modes

| Mode | Purpose | Engine |
|------|---------|--------|
| `epv` | Events-per-variable planner | Rule-based EPV thresholds |
| `single_predictor` | One binary predictor | Hsieh et al. (1999) normal approximation (`scipy.stats.norm`) |
| `multivariable_simulation` | Several predictors | Monte Carlo + IRLS logistic fit |

## API

`POST /` with JSON body.

### Mode 1 — EPV planner

```json
{
  "mode": "epv",
  "n_total": 63,
  "n_events": 45,
  "n_predictors": 3,
  "target_epv": 15
}
```

### Mode 2 — Single predictor

Observed power:

```json
{
  "mode": "single_predictor",
  "task": "power",
  "n": 100,
  "outcome_prevalence": 0.30,
  "exposure_prevalence": 0.40,
  "odds_ratio": 1.8,
  "alpha": 0.05
}
```

Required sample size:

```json
{
  "mode": "single_predictor",
  "task": "required_n",
  "outcome_prevalence": 0.30,
  "exposure_prevalence": 0.40,
  "odds_ratio": 1.8,
  "target_power": 0.80,
  "alpha": 0.05
}
```

### Mode 3 — Multivariable simulation

```json
{
  "mode": "multivariable_simulation",
  "n": 200,
  "n_predictors": 3,
  "outcome_prevalence": 0.25,
  "effect_odds_ratios": [1.5, 1.2, 2.0],
  "predictor_correlation": 0.3,
  "coefficient_index": 1,
  "n_simulations": 500,
  "alpha": 0.05
}
```

## Deploy (Google Cloud Run)

```bash
cd cloud-functions/logistic_power
gcloud run deploy logistic-power \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --entry-point logistic_power
```

## Local test

```bash
pip install -r requirements.txt
functions-framework --target=logistic_power --debug
```

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"mode":"epv","n_total":63,"n_events":45,"n_predictors":3}'
```

## Statistico integration

The logistic results dialog (`logistic-results-v3.html`) uses `shared-logistic-power.js` to call this endpoint. Set the URL:

```js
window.LOGISTIC_POWER_URL = 'https://your-service.run.app';
```

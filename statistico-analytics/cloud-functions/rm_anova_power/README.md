# Repeated Measures ANOVA Power Analysis

Cloud function for calculating statistical power in repeated measures (dependent samples) ANOVA designs.

## Features

- **Observed Power**: Calculate power from existing ANOVA results
- **Required Sample Size**: Determine how many subjects needed for target power
- **Effect Size Conversion**: Supports Cohen's f or partial eta squared
- **Non-central F Distribution**: Accurate power calculations using scipy

## API Endpoints

### Observed Power Mode

Calculate power from your ANOVA results:

```json
POST /rm-anova-power
{
  "mode": "observed",
  "f_statistic": 12.45,
  "df_between": 2,
  "df_error": 38,
  "n": 20,
  "k": 3,
  "alpha": 0.05
}
```

**Response:**
```json
{
  "ok": true,
  "results": {
    "observed_power": 0.998,
    "effect_size_cohen_f": 1.25,
    "interpretation": "Excellent power",
    "required_for_80pct": 8,
    "required_for_90pct": 10
  }
}
```

### Required Sample Size Mode

Calculate how many subjects you need:

```json
POST /rm-anova-power
{
  "mode": "required",
  "partial_eta_squared": 0.25,
  "k": 3,
  "target_power": 0.80,
  "alpha": 0.05
}
```

**Response:**
```json
{
  "ok": true,
  "results": {
    "required_sample_size": 12,
    "achieved_power": 0.81,
    "effect_size_cohen_f": 0.577,
    "interpretation": "You need 12 subjects to achieve 80% power"
  }
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | Yes | "observed" or "required" |
| `f_statistic` | float | Observed mode | F statistic from ANOVA |
| `df_between` | int | Observed mode | Degrees of freedom (k-1) |
| `df_error` | int | Observed mode | Error df: (n-1)(k-1) |
| `n` | int | Observed mode | Number of subjects |
| `k` | int | Both | Number of timepoints/conditions |
| `effect_size_f` | float | Required mode | Cohen's f (or use partial_eta_squared) |
| `partial_eta_squared` | float | Required mode | Alternative to Cohen's f |
| `target_power` | float | Required mode | Desired power (0.50-0.99) |
| `alpha` | float | Both | Significance level (default 0.05) |

## Effect Size Guidelines

**Cohen's f:**
- Small: 0.10
- Medium: 0.25
- Large: 0.40

**Partial Eta Squared (η²p):**
- Small: 0.01 (f = 0.10)
- Medium: 0.06 (f = 0.25)
- Large: 0.14 (f = 0.40)

## Deployment

### Google Cloud Functions

```bash
gcloud functions deploy rm-anova-power \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point rm_anova_power \
  --region us-central1
```

### AWS Lambda

1. Package dependencies:
```bash
pip install -r requirements.txt -t package/
cp main.py package/
cd package && zip -r ../rm-anova-power.zip .
```

2. Deploy via AWS CLI or Console

## Testing Locally

```bash
pip install -r requirements.txt
pip install functions-framework

functions-framework --target=rm_anova_power --debug
```

Test with curl:
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"mode":"observed","f_statistic":12.45,"df_between":2,"df_error":38,"n":20,"k":3}'
```

## Integration with Statistico Analytics

This function integrates with the dependent (repeated measures) module to provide:
1. Real-time power calculations after running RM-ANOVA
2. Sample size planning for study design
3. Effect size interpretation and recommendations

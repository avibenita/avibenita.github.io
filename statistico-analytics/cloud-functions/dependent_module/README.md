# Dependent (Repeated Measures) Module

Cloud function for all dependent/paired/repeated measures statistical analyses.

## Structure

```
dependent_module/
├── main.py              - Main entry point with routing
├── requirements.txt     - Dependencies
└── README.md           - This file
```

## Operations

### 1. Power Analysis (`operation: "power"`)

Calculate statistical power for repeated measures ANOVA.

**Request:**
```json
{
  "operation": "power",
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
  "operation": "power_analysis",
  "results": {
    "observed_power": 0.998,
    "effect_size_cohen_f": 1.217,
    "required_for_80pct": 8,
    "required_for_90pct": 10
  }
}
```

### 2. Permutation Tests (Coming Soon)

### 3. Bootstrap CI (Coming Soon)

### 4. Effect Sizes (Coming Soon)

## Deployment

```bash
gcloud functions deploy dependent-module \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point dependent_module \
  --region us-central1
```

## URL Structure

Single function handles all operations via `operation` parameter:

```
https://REGION-PROJECT.cloudfunctions.net/dependent-module
```

## Benefits

- ✅ One function for all dependent analyses
- ✅ Shared code = no duplication
- ✅ Fewer cold starts
- ✅ Easier to maintain
- ✅ Lower cost

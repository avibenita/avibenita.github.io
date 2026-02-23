# Permutation Engine (Google Cloud Functions)

Python HTTP function for two-sample permutation testing with supplementary statistics.

The response always includes:

- `engine_notice`: `Resampling and power calculations use SciPy-based engine`

## Endpoint

- Function name (entry point): `permutation_engine`
- Method: `POST`
- Content-Type: `application/json`

## Deploy (Gen2)

```bash
gcloud functions deploy permutation-engine \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=cloud-functions/permutation_engine \
  --entry-point=permutation_engine \
  --trigger-http \
  --allow-unauthenticated
```

## Request Body

```json
{
  "group_a": [1.2, 2.1, 1.7, 2.3],
  "group_b": [0.9, 1.1, 1.0, 1.4],
  "alternative": "two-sided",
  "alpha": 0.05,
  "permutations": 5000,
  "seed": 42
}
```

## Response (shape)

```json
{
  "ok": true,
  "engine_notice": "Resampling and power calculations use SciPy-based engine",
  "input": {
    "n_group_a": 4,
    "n_group_b": 4,
    "alternative": "two-sided",
    "alpha": 0.05,
    "permutations": 5000,
    "seed": 42
  },
  "results": {
    "mean_diff": 0.725,
    "effect_size_cohen_d": 1.23,
    "bootstrap_ci_mean_diff": [0.2, 1.18],
    "permutation_test": {"statistic": 0.725, "p_value": 0.012},
    "welch_t": {"statistic": 2.9, "p_value": 0.024},
    "student_t": {"statistic": 2.8, "p_value": 0.026},
    "power_estimate": {"method": "noncentral-t approximation", "value": 0.81}
  }
}
```

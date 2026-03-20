# ANOVA Power Analysis Cloud Function

Cloud Function for calculating required sample size for one-way ANOVA using non-central F-distribution.

## Deployment

### Using gcloud CLI:

```bash
cd cloud-functions/anova-module
gcloud functions deploy anova-module \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=anova_module \
  --trigger=http \
  --allow-unauthenticated \
  --set-env-vars="FUNCTION_TARGET=anova_module"
```

### Using Google Cloud Console:

1. Go to Cloud Functions in Google Cloud Console
2. Create Function
3. Select "2nd gen" (Gen 2)
4. Function name: `anova-module`
5. Region: `us-central1`
6. Runtime: `Python 3.11`
7. Entry point: `anova_module`
8. Trigger: HTTP
9. Allow unauthenticated invocations: Yes
10. Upload the `main.py` and `requirements.txt` files
11. Deploy

## API Usage

**Endpoint:** `https://us-central1-tukey-multple-comparisons.cloudfunctions.net/anova-module`

**Parameters:**
- `num_groups` (int, required): Number of groups
- `effect_size_f` (float, required): Cohen's f effect size
- `target_power` (float, default=0.8): Desired statistical power
- `significance_level` (float, default=0.05): Alpha level

**Example:**
```
GET https://us-central1-tukey-multple-comparisons.cloudfunctions.net/anova-module?num_groups=3&effect_size_f=0.25&target_power=0.8&significance_level=0.05
```

**Response:**
```json
{
  "required_sample_size_per_group": 15,
  "total_sample_size": 45,
  "actual_power": 0.8234,
  "parameters": {
    "num_groups": 3,
    "effect_size_f": 0.25,
    "target_power": 0.8,
    "significance_level": 0.05
  }
}
```

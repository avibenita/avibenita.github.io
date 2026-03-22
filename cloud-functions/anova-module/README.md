# ANOVA Power Analysis Cloud Function

Cloud Function for calculating required sample size for one-way ANOVA using non-central F-distribution.

## Local development (PyCharm or terminal)

Use the [Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-python) (already in `requirements.txt`) so the same `anova_module` entry point runs on your machine with CORS enabled.

1. **Create a virtualenv** (PyCharm: *Add Interpreter → Virtualenv*), then install deps:

   ```bash
   cd cloud-functions/anova-module
   pip install -r requirements.txt
   ```

2. **Run the HTTP server** (listens on port **8080** by default):

   ```bash
   functions-framework --target=anova_module --port=8080 --debug
   ```

   **PyCharm:** *Run → Edit Configurations → + Python*, then set **Module name** to `functions_framework`, **Parameters** to `--target=anova_module --port=8080 --debug`, and **Working directory** to `cloud-functions/anova-module`.

3. **Point the calculator at localhost.** Serve the repo over HTTP (e.g. `python -m http.server 8000` from the repo root) and open:

   ```text
   http://localhost:8000/statistico-calculators/power-sample-size-calculator/index-calculator.html?anovaApi=http%3A%2F%2F127.0.0.1%3A8080
   ```

   (`anovaApi` is the base URL only; the page appends `?num_groups=…&effect_size_f=…` itself. For a local Functions Framework instance the base is `http://127.0.0.1:8080` with **no** `/anova-module` path.)

4. **Smoke test** the API directly:

   ```text
   http://127.0.0.1:8080/?num_groups=3&effect_size_f=0.25&target_power=0.8&significance_level=0.05
   ```

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

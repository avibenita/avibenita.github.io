# Deploying the RM-ANOVA Power Analysis Cloud Function

## Option 1: Google Cloud Functions (Recommended)

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed

### Deploy

```bash
cd cloud-functions/rm_anova_power

gcloud functions deploy rm-anova-power \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point rm_anova_power \
  --region us-central1 \
  --memory 256MB \
  --timeout 30s
```

### Get the URL

After deployment:
```bash
gcloud functions describe rm-anova-power --region us-central1 --format='value(httpsTrigger.url)'
```

### Update the Add-in

Copy the URL and update in `dialogs/views/dependent/dependent-results-kplus.html`:

```javascript
const CLOUD_FUNCTION_URL = 'https://YOUR-REGION-PROJECT.cloudfunctions.net/rm-anova-power';
```

---

## Option 2: AWS Lambda

### Prerequisites
- AWS account
- AWS CLI configured

### Package and Deploy

```bash
cd cloud-functions/rm_anova_power

# Create package
pip install -r requirements.txt -t package/
cp main.py package/
cd package && zip -r ../rm-anova-power.zip .
cd ..

# Deploy via AWS CLI
aws lambda create-function \
  --function-name rm-anova-power \
  --runtime python3.11 \
  --role arn:aws:iam::YOUR-ACCOUNT:role/lambda-execution-role \
  --handler main.rm_anova_power \
  --zip-file fileb://rm-anova-power.zip \
  --timeout 30 \
  --memory-size 256
```

### Create API Gateway

```bash
aws apigatewayv2 create-api \
  --name rm-anova-power-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:REGION:ACCOUNT:function:rm-anova-power
```

Get the API endpoint URL and update the add-in.

---

## Option 3: Vercel Serverless Functions

### Prerequisites
- Vercel account
- Vercel CLI installed

### Deploy

```bash
cd cloud-functions/rm_anova_power

# Create vercel.json
cat > vercel.json << EOF
{
  "functions": {
    "api/rm-anova-power.py": {
      "runtime": "python3.9"
    }
  }
}
EOF

# Create api directory
mkdir -p api
cp main.py api/rm-anova-power.py
cp requirements.txt api/

# Deploy
vercel --prod
```

---

## Option 4: Local Development/Testing

### Run Locally

```bash
cd cloud-functions/rm_anova_power

# Install dependencies
pip install -r requirements.txt
pip install functions-framework

# Start local server
functions-framework --target=rm_anova_power --debug --port=8080
```

### Test Locally

```bash
# Test observed power
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "observed",
    "f_statistic": 12.45,
    "df_between": 2,
    "df_error": 38,
    "n": 20,
    "k": 3,
    "alpha": 0.05
  }'

# Test required sample size
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "required",
    "partial_eta_squared": 0.25,
    "k": 3,
    "target_power": 0.80,
    "alpha": 0.05
  }'
```

### Use Local URL in Development

Update the URL in `dependent-results-kplus.html`:

```javascript
const CLOUD_FUNCTION_URL = 'http://localhost:8080';  // For local development
```

---

## Testing the Integration

1. **Deploy the cloud function** using one of the methods above
2. **Update the URL** in `dependent-results-kplus.html`
3. **Commit and push** the changes
4. **Wait for GitHub Pages** to deploy (~2 minutes)
5. **Clear Excel cache** and reload the add-in
6. **Run a repeated measures analysis** with 3+ timepoints
7. **Check the Power tab** to see the analysis

---

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console, ensure your cloud function returns the correct headers:

```python
headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}
```

### Timeout Errors

- Increase function timeout to 30-60 seconds
- Check function logs for errors
- Verify the request payload is correct

### Authentication Errors

- Ensure the function is publicly accessible (for now)
- Later, you can add API key authentication

---

## Cost Estimates

### Google Cloud Functions
- **Free tier**: 2 million invocations/month
- **After free tier**: $0.40 per million invocations
- **Estimated cost**: $0-$5/month for typical usage

### AWS Lambda
- **Free tier**: 1 million requests/month
- **After free tier**: $0.20 per million requests
- **Estimated cost**: $0-$3/month for typical usage

### Vercel
- **Hobby plan**: 100GB-hours/month free
- **Pro plan**: $20/month with more generous limits

---

## Next Steps

1. Deploy the function
2. Update the URL in the add-in
3. Test the integration
4. (Optional) Add API key authentication
5. (Optional) Add monitoring and logging
6. (Optional) Create additional power analysis functions for other test types

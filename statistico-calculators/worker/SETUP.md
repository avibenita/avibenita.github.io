# Statistico AI — Premium Feature Setup Guide

This guide explains how to deploy the Cloudflare Worker that powers the AI Interpretation
paywall, generate and sell license keys, and manage the system going forward.

---

## How It Works

```
User clicks "Get AI Interpretation"
        │
        ▼
No license key stored?  ──► Show "Get Premium Access" panel
        │
        ▼ (key exists)
POST { prompt, licenseKey }
        │
        ▼
Cloudflare Worker
  ├─ Validate key against KV store
  │     └─ Invalid?  ──► Return 403, UI shows unlock panel
  └─ Valid?  ──► Call Groq API (key stays server-side)
                   └─ Return AI text to browser
```

Your **Groq API key never reaches the browser**. Users only ever see a license key
they purchased from you.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Wrangler CLI | `npm install -g wrangler` |
| Cloudflare account (free) | https://cloudflare.com |
| Groq account (free) | https://console.groq.com |

---

## Step 1 — Deploy the Cloudflare Worker

### 1.1 Log in to Cloudflare

```bash
npx wrangler login
```

A browser window will open. Authorize Wrangler.

### 1.2 Create the KV namespace

```bash
cd statistico-calculators/worker
npx wrangler kv:namespace create LICENSE_KV
```

You will see output like:

```
🌀 Creating namespace with title "statistico-ai-LICENSE_KV"
✅ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "LICENSE_KV"
id = "abc123def456..."
```

Open `wrangler.toml` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with the `id` value printed above.

### 1.3 Add your Groq API key as a secret

```bash
npx wrangler secret put GROQ_API_KEY
```

When prompted, paste your Groq API key (from https://console.groq.com/keys).
The key is stored encrypted — it is **never** in any file or commit.

### 1.4 Deploy

```bash
npx wrangler deploy
```

On success you will see:

```
✅ Deployed statistico-ai
   https://statistico-ai.YOUR-SUBDOMAIN.workers.dev
```

### 1.5 Update the Worker URL in the frontend

Open:
```
statistico-calculators/0Distribution_Calculators/statistical-distributions/shared/ai-insights-component.js
```

Find line 10 and replace the placeholder with your actual URL:

```js
const WORKER_URL = 'https://statistico-ai.YOUR-SUBDOMAIN.workers.dev';
```

Commit and push:

```bash
git add statistico-calculators/0Distribution_Calculators/statistical-distributions/shared/ai-insights-component.js
git commit -m "config: set live Cloudflare Worker URL"
git push origin main
```

---

## Step 2 — Generate License Keys

From the `worker/` folder, run:

```bash
node generate-keys.mjs 10
```

This prints 10 keys in the format `STAT-XXXX-XXXX-XXXX` together with the
Wrangler commands to register them:

```
# Key: STAT-A1B2-C3D4-E5F6
npx wrangler kv:key put --binding=LICENSE_KV "STAT-A1B2-C3D4-E5F6" '{"plan":"pro","created":"2026-04-25"}'

# Key: STAT-F6E5-D4C3-B2A1
npx wrangler kv:key put --binding=LICENSE_KV "STAT-F6E5-D4C3-B2A1" '{"plan":"pro","created":"2026-04-25"}'
...
```

Copy all the `npx wrangler kv:key put ...` lines and run them.
Each key is now valid and will be accepted by the Worker.

**Tip:** Pipe directly to your shell in one go:

```bash
node generate-keys.mjs 20 | grep "^npx" | bash
```

---

## Step 3 — Sell License Keys

### Recommended: Gumroad (free, handles VAT & receipts)

1. Go to https://gumroad.com and create a product (e.g. "Statistico AI — Pro Access").
2. Set the price and description.
3. In the product's **Thank You** page or confirmation email, paste the buyer's unique license key manually (for small volumes) or automate via Gumroad's webhook (see below).
4. Update `BUY_URL` in `ai-insights-component.js` line 11 to your Gumroad product link.

### Alternative: Lemon Squeezy

Similar to Gumroad; also handles EU VAT automatically.
Product URL → https://lemonsqueezy.com

---

## Step 4 — Revoking a Key

To revoke a license key immediately (e.g. refund or abuse):

```bash
npx wrangler kv:key delete --binding=LICENSE_KV "STAT-A1B2-C3D4-E5F6"
```

The key will be rejected by the Worker on the next request.

---

## Step 5 — Automating Key Delivery (Optional)

For hands-free delivery, use a Gumroad webhook + a second Worker or a serverless function
that runs `generate-keys.mjs` logic and emails the key to the buyer.

High-level flow:

```
Gumroad sale confirmed
        │
        ▼
Webhook → your delivery endpoint (Cloudflare Worker or Netlify Function)
        │
        ▼
Generate key → write to LICENSE_KV → send email to buyer (via Resend / SendGrid)
```

This is optional — manual delivery works fine at low volumes.

---

## Ongoing Management

| Task | Command |
|------|---------|
| List all keys | `npx wrangler kv:key list --binding=LICENSE_KV` |
| Check a specific key | `npx wrangler kv:key get --binding=LICENSE_KV "STAT-XXXX-XXXX-XXXX"` |
| Delete a key (revoke) | `npx wrangler kv:key delete --binding=LICENSE_KV "STAT-XXXX-XXXX-XXXX"` |
| Rotate Groq API key | `npx wrangler secret put GROQ_API_KEY` |
| View Worker logs | `npx wrangler tail` |
| Redeploy Worker | `npx wrangler deploy` |

---

## File Reference

```
statistico-calculators/worker/
├── worker.js           — Cloudflare Worker source (validates key, proxies Groq)
├── wrangler.toml       — Deployment config (add your KV namespace id here)
└── generate-keys.mjs   — CLI tool to generate and register license keys
```

```
statistico-calculators/.../shared/ai-insights-component.js
  line 10  WORKER_URL     — URL of your deployed Worker
  line 11  BUY_URL        — URL of your sales page (Gumroad etc.)
  line 12  LICENSE_KEY_STORE — localStorage key name (no need to change)
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "Invalid or expired license key" | Key not added to KV | Run the `kv:key put` command for that key |
| "Server error 500" | Groq key missing or wrong | `npx wrangler secret put GROQ_API_KEY` |
| Unlock panel always shown | Wrong `WORKER_URL` | Update line 10 in `ai-insights-component.js` |
| CORS error in browser | Worker not deployed | `npx wrangler deploy` |
| Old version still loading | Browser cache | Hard-refresh (Ctrl+Shift+R) or bump the `?v=` version in HTML files |

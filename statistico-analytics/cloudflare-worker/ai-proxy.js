/**
 * Statistico AI Proxy — Cloudflare Worker
 *
 * Deployment steps:
 *  1. Install Wrangler:  npm install -g wrangler
 *  2. Login:             wrangler login
 *  3. Deploy:            wrangler deploy
 *  4. Add secret:        wrangler secret put GROQ_KEY
 *     (paste your Groq API key when prompted — it is never stored in code)
 *  5. Copy the deployed Worker URL (e.g. https://statistico-ai.YOUR.workers.dev)
 *     and paste it into:  statistico-analytics/src/shared/js/ai-config.js
 *
 * The worker forwards POST requests to Groq, injects the secret key,
 * and returns the response with CORS headers so the Office Add-in can call it.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {

    /* ── CORS preflight ───────────────────────────────────────── */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    /* ── Only accept POST ─────────────────────────────────────── */
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    /* ── Validate key is configured ───────────────────────────── */
    if (!env.GROQ_KEY) {
      return new Response(JSON.stringify({ error: 'AI proxy not configured — GROQ_KEY secret missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    /* ── Forward to Groq ──────────────────────────────────────── */
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await groqRes.json();

    return new Response(JSON.stringify(data), {
      status: groqRes.status,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
};

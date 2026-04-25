/**
 * Statistico AI Worker
 * Cloudflare Worker that:
 *  1. Validates a Statistico license key (stored in KV)
 *  2. Proxies the prompt to Groq / Llama
 *  3. Returns the text response — Groq API key never reaches the browser
 *
 * Environment variables (set in Cloudflare dashboard → Workers → Settings → Variables):
 *   GROQ_API_KEY  — your Groq secret key
 *
 * KV namespace (bind as LICENSE_KV in wrangler.toml):
 *   Each valid key is stored as:   KV key = licenseKey string, value = JSON metadata
 *   e.g.  "STAT-1234-ABCD-5678"  →  '{"plan":"pro","email":"user@example.com","created":"2026-04-25"}'
 */

const MODELS = [
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'llama-3.3-70b-versatile',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { prompt, licenseKey } = body;

    if (!prompt) return json({ error: 'Missing prompt' }, 400);

    // ── Validate license key ────────────────────────────────────────────────
    if (!licenseKey) {
      return json({ error: 'License key required', code: 'NO_KEY' }, 401);
    }

    const keyData = await env.LICENSE_KV.get(licenseKey.trim().toUpperCase());
    if (!keyData) {
      return json({ error: 'Invalid or expired license key', code: 'INVALID_KEY' }, 403);
    }

    // ── Call Groq ───────────────────────────────────────────────────────────
    let lastErr = null;
    for (const model of MODELS) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a concise statistics expert embedded in an interactive calculator. Respond with plain text only — no markdown, no bullet points, no headers.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.6,
          }),
        });

        if (!resp.ok) {
          let msg = `HTTP ${resp.status}`;
          try { const e = await resp.json(); msg = e?.error?.message || msg; } catch {}
          if (resp.status === 404 || msg.toLowerCase().includes('not found')) {
            lastErr = new Error(msg); continue;
          }
          return json({ error: msg }, resp.status);
        }

        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) { lastErr = new Error('Empty response'); continue; }

        return json({ text, model });

      } catch (err) {
        if (err.message?.toLowerCase().includes('not found') ||
            err.message?.toLowerCase().includes('does not exist')) {
          lastErr = err; continue;
        }
        return json({ error: err.message || 'Worker error' }, 500);
      }
    }

    return json({ error: lastErr?.message || 'No available model', code: 'MODEL_ERROR' }, 502);
  },
};

/**
 * Early Access licensing endpoint.
 * POST { action: "early-access", email, channel, scope }
 *   → creates or retrieves an immediate EARLY_ACCESS grant.
 * GET  ?email=
 *   → returns the stored grant, or an error so the hub keeps its local cache.
 *
 * Optional KV binding ENTITLEMENT_KV (or LICENSE_KV) stores one grant per email.
 * Without it, activation still succeeds and the hub persists the grant locally.
 */
import policy from "./early-access-policy.cjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept"
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

function storeOf(env) {
  if (!env) return null;
  return env.ENTITLEMENT_KV || env.LICENSE_KV || null;
}

function storageKey(email) {
  return "early-access:" + email;
}

async function readGrant(store, email) {
  if (!store) return null;
  try {
    var raw = await store.get(storageKey(email));
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

async function writeGrant(store, email, grant) {
  if (!store) return;
  await store.put(storageKey(email), JSON.stringify(grant));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "GET") {
      var lookupEmail = policy.normalizeLicenseEmail(new URL(request.url).searchParams.get("email"));
      if (!policy.isLicenseEmail(lookupEmail)) return json({ error: true }, 400);
      var lookupStore = storeOf(env);
      if (!lookupStore) return json({ error: true }, 503);
      var stored = await readGrant(lookupStore, lookupEmail);
      if (!stored || !stored.plan) return json({ error: true }, 404);
      return json({
        plan: stored.plan,
        email: policy.normalizeLicenseEmail(stored.email || lookupEmail),
        expiresAt: stored.expiresAt || null
      });
    }

    if (request.method !== "POST") return json({ error: true }, 405);

    var body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: true }, 400);
    }
    if (!body || body.action !== "early-access") return json({ error: true }, 400);

    var email = policy.normalizeLicenseEmail(body.email);
    if (!policy.isLicenseEmail(email)) return json({ error: true }, 400);

    var store = storeOf(env);
    var existing = await readGrant(store, email);
    var grant = policy.createOrRetrieveEarlyAccess(email, existing, Date.now());
    if (grant.error) return json({ error: true }, 400);
    try {
      await writeGrant(store, email, grant);
    } catch (e) {
      return json({ error: true }, 503);
    }
    return json(grant);
  }
};

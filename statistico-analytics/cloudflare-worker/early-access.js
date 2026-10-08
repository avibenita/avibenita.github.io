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
import { EmailMessage } from "cloudflare:email";
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

var FEEDBACK_TO = "avi@metrics-institute.net";
var FEEDBACK_FROM = "feedback@statistico.live";

function feedbackText(message, reply) {
  return message + (reply ? "\n\nFrom: " + reply : "\n\nFrom: (no email given)");
}

async function storeFeedback(env, message, reply) {
  var store = storeOf(env);
  if (!store) return;
  var id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  await store.put("feedback:" + id, JSON.stringify({
    at: new Date().toISOString(),
    email: reply || "",
    message: message
  }), { expirationTtl: 60 * 60 * 24 * 30 });
}

async function sendViaCloudflare(env, text) {
  if (!env || !env.SEND_EMAIL || typeof env.SEND_EMAIL.send !== "function") return false;
  var raw = [
    "From: Statistico <" + FEEDBACK_FROM + ">",
    "To: " + FEEDBACK_TO,
    "Subject: Statistico Early Access feedback",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text
  ].join("\r\n");
  try {
    await env.SEND_EMAIL.send(new EmailMessage(FEEDBACK_FROM, FEEDBACK_TO, raw));
    return true;
  } catch (e) {
    return false;
  }
}

async function sendFeedback(env, payload) {
  var message = String(payload && payload.message || "").trim();
  if (!message || message.length > 20000) return json({ error: true }, 400);
  var reply = String(payload && payload.email || "").trim();
  if (reply && !policy.isLicenseEmail(policy.normalizeLicenseEmail(reply))) {
    return json({ error: true }, 400);
  }
  var text = feedbackText(message, reply);
  try { await storeFeedback(env, message, reply); } catch (e) { /* keep trying to deliver */ }
  if (await sendViaCloudflare(env, text)) return json({ ok: true });
  return json({ ok: false });
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
    if (!body || (body.action !== "early-access" && body.action !== "feedback")) {
      return json({ error: true }, 400);
    }
    if (body.action === "feedback") return sendFeedback(env, body);

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

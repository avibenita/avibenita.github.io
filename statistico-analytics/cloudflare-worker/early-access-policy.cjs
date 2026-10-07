/**
 * Immediate Early Access grants. EARLY_ACCESS is not an allow-list:
 * the hub opens every module in the production registry while this plan is current.
 * FREE stays on FREE_MODULE_IDS in hub-entitlement.js.
 */
var EARLY_ACCESS_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

function normalizeLicenseEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isLicenseEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createOrRetrieveEarlyAccess(email, existing, now) {
  var normalized = normalizeLicenseEmail(email);
  if (!isLicenseEmail(normalized)) return { error: true };
  var nowMs = Number(now) || Date.now();
  if (existing && normalizeLicenseEmail(existing.email) === normalized) {
    var plan = String(existing.plan || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    var exp = Date.parse(existing.expiresAt || "");
    if (plan === "EARLY_ACCESS" && !isNaN(exp) && exp > nowMs) {
      return {
        plan: "EARLY_ACCESS",
        email: normalized,
        expiresAt: new Date(exp).toISOString()
      };
    }
  }
  return {
    plan: "EARLY_ACCESS",
    email: normalized,
    expiresAt: new Date(nowMs + EARLY_ACCESS_PERIOD_MS).toISOString()
  };
}

module.exports = {
  EARLY_ACCESS_PERIOD_MS: EARLY_ACCESS_PERIOD_MS,
  normalizeLicenseEmail: normalizeLicenseEmail,
  isLicenseEmail: isLicenseEmail,
  createOrRetrieveEarlyAccess: createOrRetrieveEarlyAccess
};

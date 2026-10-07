const policy = require("./early-access-policy.cjs");

const NOW = Date.parse("2026-10-07T08:00:00Z");

describe("early access grants", () => {
  test("normalizes the email and creates an immediate grant", () => {
    const grant = policy.createOrRetrieveEarlyAccess("  MetricsInstitute@Gmail.com ", null, NOW);
    expect(grant).toEqual({
      plan: "EARLY_ACCESS",
      email: "metricsinstitute@gmail.com",
      expiresAt: new Date(NOW + policy.EARLY_ACCESS_PERIOD_MS).toISOString()
    });
  });

  test("retrieves the same unexpired grant", () => {
    const existing = {
      plan: "EARLY_ACCESS",
      email: "metricsinstitute@gmail.com",
      expiresAt: "2026-12-01T00:00:00.000Z"
    };
    expect(policy.createOrRetrieveEarlyAccess("metricsinstitute@gmail.com", existing, NOW)).toEqual({
      plan: "EARLY_ACCESS",
      email: "metricsinstitute@gmail.com",
      expiresAt: "2026-12-01T00:00:00.000Z"
    });
  });

  test("an expired grant starts a new period instead of reopening the old one", () => {
    const existing = {
      plan: "EARLY_ACCESS",
      email: "metricsinstitute@gmail.com",
      expiresAt: "2026-10-01T00:00:00.000Z"
    };
    const grant = policy.createOrRetrieveEarlyAccess("metricsinstitute@gmail.com", existing, NOW);
    expect(grant.expiresAt).toBe(new Date(NOW + policy.EARLY_ACCESS_PERIOD_MS).toISOString());
  });

  test("rejects an address that is not an email", () => {
    expect(policy.createOrRetrieveEarlyAccess("not-an-email", null, NOW)).toEqual({ error: true });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvoanceClient, AuthenticationError } from "../src/index.js";

const BASE = "http://localhost:8080/v1";

function mockClient() {
  return new InvoanceClient({ apiKey: "inv_test_key", baseUrl: BASE });
}

/** A representative GET /v1/me body — note the audit-only scopes. */
const ME_BODY = {
  valid: true,
  organization: {
    id: "org_01J8F3KQ2R7VWX9YB4ND6MCZAH",
    name: "Acme Corp",
    issuer_name: "Acme Corp, Inc.",
    primary_domain: "acme.example",
    domain_verified: true,
    plan_tier: "growth",
  },
  tenant: { id: "ten_1", name: "Acme Corp" },
  api_key: {
    id: "key_1",
    name: "ci key",
    key_prefix: "inv_test",
    key_last4: "_key",
    scopes: ["audit:write", "audit:read"],
    created_at: "2026-07-01T00:00:00Z",
  },
  limits: { rate_limit_per_sec: 50 },
};

describe("InvoanceClient.validate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls GET /v1/me and reports valid on 200 — even for audit-only-scoped keys", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(ME_BODY), { status: 200 }),
    );

    const result = await mockClient().validate();

    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.baseUrl).toBe(BASE);

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toBe(`${BASE}/v1/me`);
    expect(call[1]?.method).toBe("GET");
  });

  it("reports invalid on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
      }),
    );

    const result = await mockClient().validate();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Authentication failed");
  });

  it("reports valid-but-refused on 403 (IP access rules)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "ip_not_allowed" }), {
        status: 403,
      }),
    );

    const result = await mockClient().validate();

    expect(result.valid).toBe(true);
    expect(result.reason).toContain("authenticated");
  });

  it("reports valid-but-rate-limited on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }),
    );

    const result = await mockClient().validate();

    expect(result.valid).toBe(true);
    expect(result.reason).toContain("rate limited");
  });

  it("reports invalid when the server is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("fetch failed"),
    );

    const result = await mockClient().validate();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("unreachable");
  });
});

describe("InvoanceClient.me", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed GET /v1/me body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(ME_BODY), { status: 200 }),
    );

    const me = await mockClient().me();

    expect(me.valid).toBe(true);
    expect(me.organization.plan_tier).toBe("growth");
    expect(me.api_key.scopes).toEqual(["audit:write", "audit:read"]);
    expect(me.limits.rate_limit_per_sec).toBe(50);

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toBe(`${BASE}/v1/me`);
    expect(call[1]?.method).toBe("GET");
  });

  it("throws AuthenticationError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
      }),
    );

    await expect(mockClient().me()).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});

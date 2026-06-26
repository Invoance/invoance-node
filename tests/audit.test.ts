/**
 * Client-side audit verify — golden-vector conformance + tamper test.
 *
 * Reproduces the backend's frozen canonical bytes / payload hash for every committed
 * vector, confirms the committed signature verifies, and that a tampered field fails.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { canonicalAuditBytes, payloadHashHex } from "../src/audit-canonical.js";
import { verifyAuditEvent } from "../src/audit-verify.js";
import { InvoanceClient, contentIdempotencyKey } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, "fixtures", "audit_vectors.json"), "utf-8"));

function apiEvent(v: any): Record<string, unknown> {
  const e: Record<string, any> = { ...v.event };
  e.id = e.event_id;
  delete e.event_id;
  e.signature = v.signature_ed25519;
  e.payload_hash = v.payload_hash_sha256;
  e.signing_public_key = v.public_key;
  return e;
}

// JS numbers are IEEE-754 doubles: integer metadata beyond 2^53 cannot round-trip
// through JSON.parse, so those vectors are out of scope for client-side verify in JS.
function hasUnsafeNumber(v: unknown): boolean {
  if (typeof v === "number") return !Number.isSafeInteger(v);
  if (Array.isArray(v)) return v.some(hasUnsafeNumber);
  if (v && typeof v === "object")
    return Object.values(v as Record<string, unknown>).some(hasUnsafeNumber);
  return false;
}

const safeVectors = (doc.vectors as any[]).filter((v) => !hasUnsafeNumber(v.event));

describe("audit canonical + verify (golden vectors)", () => {
  it("reproduces canonical bytes + payload hash byte-for-byte", () => {
    expect(doc.schema_id).toBe("invoance.audit/1");
    for (const v of safeVectors) {
      const canonical = canonicalAuditBytes(v.event);
      expect(new TextDecoder().decode(canonical), v.name).toBe(v.canonical_utf8);
      expect(payloadHashHex(canonical), v.name).toBe(v.payload_hash_sha256);
    }
  });

  it("verifies every committed signature under the embedded key", () => {
    for (const v of safeVectors) {
      const r = verifyAuditEvent(apiEvent(v));
      expect(r.valid, `${v.name}: ${r.reason}`).toBe(true);
      expect(r.keySource).toBe("event");
    }
  });

  it("skips exactly one int64-beyond-2^53 vector (a JS number limitation, not a bug)", () => {
    expect(doc.vectors.length - safeVectors.length).toBe(1);
  });

  it("supports a pinned key and rejects tampering", () => {
    const ev = apiEvent(doc.vectors[0]);
    const pinned = verifyAuditEvent(ev, { publicKey: doc.test_public_key });
    expect(pinned.valid).toBe(true);
    expect(pinned.keySource).toBe("pinned");

    const tampered = { ...ev, action: String(ev.action) + ".tampered" };
    const r = verifyAuditEvent(tampered);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("payload_hash_mismatch");
  });
});

describe("audit namespace wiring", () => {
  it("exposes client.audit.* and a stable idempotency helper", () => {
    const c = new InvoanceClient({ apiKey: "invoance_live_test_key_not_real", baseUrl: "http://localhost:33100" });
    expect(c.audit.events).toBeDefined();
    expect(c.audit.orgs).toBeDefined();
    expect(c.audit.streams).toBeDefined();
    expect(c.audit.portalSessions).toBeDefined();
    expect(c.audit.exports).toBeDefined();

    const a = contentIdempotencyKey({ organization_id: "o", action: "x" });
    const b = contentIdempotencyKey({ action: "x", organization_id: "o" });
    expect(a).toBe(b);
    expect(a.startsWith("idem_")).toBe(true);
  });
});

describe("audit request wire shape (organization_id / range_* rename, 0.3.0)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockClient() {
    return new InvoanceClient({
      apiKey: "invoance_live_test_key_not_real",
      baseUrl: "http://localhost:33100",
    });
  }

  it("events.ingest puts organization_id (not org) in the body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ event_id: "aevt_x", ingested_at: "2026-01-01T00:00:00Z" }), {
        status: 201,
      }),
    );
    await mockClient().audit.events.ingest({
      organizationId: "org_x",
      action: "user.signed_in",
      actor: { type: "user", id: "u1" },
    });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.organization_id).toBe("org_x");
    expect(body.org).toBeUndefined();
  });

  it("events.list sends organization_id + range_start/range_end query params", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ events: [], next_cursor: null }), { status: 200 }),
    );
    await mockClient().audit.events.list({
      organizationId: "org_x",
      rangeStart: "2026-01-01T00:00:00Z",
      rangeEnd: "2026-02-01T00:00:00Z",
    });
    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get("organization_id")).toBe("org_x");
    expect(url.searchParams.get("range_start")).toBe("2026-01-01T00:00:00Z");
    expect(url.searchParams.get("range_end")).toBe("2026-02-01T00:00:00Z");
    expect(url.searchParams.has("org_id")).toBe(false);
    expect(url.searchParams.has("occurred_after")).toBe(false);
  });

  it("orgs.create puts organization_id (not external_id) in the body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "aorg_x", organization_id: "org_x" }), { status: 201 }),
    );
    await mockClient().audit.orgs.create({ organizationId: "org_x", name: "Acme" });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.organization_id).toBe("org_x");
    expect(body.external_id).toBeUndefined();
  });

  it("exports.create puts organization_id (not org_id) in the body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "aexp_x", status: "pending", format: "csv" }), {
        status: 202,
      }),
    );
    await mockClient().audit.exports.create({ organizationId: "org_x", format: "csv" });
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.organization_id).toBe("org_x");
    expect(body.org_id).toBeUndefined();
  });
});

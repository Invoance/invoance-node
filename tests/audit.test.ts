/**
 * Client-side audit verify — golden-vector conformance + tamper test.
 *
 * Reproduces the backend's frozen canonical bytes / payload hash for every committed
 * vector, confirms the committed signature verifies, and that a tampered field fails.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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

    const a = contentIdempotencyKey({ org: "o", action: "x" });
    const b = contentIdempotencyKey({ action: "x", org: "o" });
    expect(a).toBe(b);
    expect(a.startsWith("idem_")).toBe(true);
  });
});

/**
 * `invoance.audit/1` canonical serializer (client-side).
 *
 * Reproduces the server's frozen canonicalization (spec-audit-1.md §4) so an event's
 * signature can be checked offline. Conformance is pinned by the same golden vectors
 * the backend uses (`tests/fixtures/audit_vectors.json`).
 *
 * Canonical bytes = build the signed object (signed fields present + non-null,
 * timestamps normalized, forced `schema_id`), strip null members recursively, sort every
 * object's keys, emit compact UTF-8.
 *
 * Limitation: JSON numbers are JS `number`s, so integer metadata beyond
 * `Number.MAX_SAFE_INTEGER` (2^53) cannot round-trip and is out of scope for client-side
 * verify. All real audit fields (seq, counts, string timestamps) are safe.
 */

import { createHash } from "node:crypto";

export const AUDIT_SCHEMA_ID = "invoance.audit/1";

const SIGNED_FIELDS = [
  "org_id",
  "event_id",
  "seq",
  "ingested_at",
  "action",
  "occurred_at",
  "actor",
  "targets",
  "context",
  "metadata",
] as const;

const REQUIRED_FIELDS = [
  "org_id",
  "event_id",
  "seq",
  "ingested_at",
  "action",
  "occurred_at",
  "actor",
  "targets",
] as const;

const RFC3339 =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|z|[+-]\d{2}:\d{2})$/;

/** RFC3339 -> the one canonical form (§4.4): UTC, exactly 3 fractional digits, `Z`. */
export function normalizeTs(value: string): string {
  if (typeof value !== "string") throw new Error("timestamp must be a string");
  const m = RFC3339.exec(value.trim());
  if (!m) throw new Error(`invalid RFC3339 timestamp: ${value}`);
  const [, yr, mo, dy, hh, mi, ss, frac, off] = m;
  const millis = parseInt(((frac ?? "") + "000").slice(0, 3), 10); // truncate
  let epoch = Date.UTC(+yr, +mo - 1, +dy, +hh, +mi, +ss, millis);
  if (off !== "Z" && off !== "z") {
    const sign = off[0] === "+" ? 1 : -1;
    const oh = parseInt(off.slice(1, 3), 10);
    const om = parseInt(off.slice(4, 6), 10);
    epoch -= sign * (oh * 3600 + om * 60) * 1000;
  }
  const d = new Date(epoch);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}Z`
  );
}

function stripNulls(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripNulls);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val === null || val === undefined) continue;
      out[k] = stripNulls(val);
    }
    return out;
  }
  return v;
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortDeep((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

function buildSignedObject(event: Record<string, unknown>): Record<string, unknown> {
  if (typeof event !== "object" || event === null || Array.isArray(event)) {
    throw new Error("event must be a JSON object");
  }
  for (const f of REQUIRED_FIELDS) {
    if (event[f] === undefined || event[f] === null) {
      throw new Error(`missing required field: ${f}`);
    }
  }
  const out: Record<string, unknown> = {};
  for (const f of SIGNED_FIELDS) {
    const v = event[f];
    if (v === undefined || v === null) continue;
    out[f] = f === "occurred_at" || f === "ingested_at" ? normalizeTs(v as string) : v;
  }
  out.schema_id = AUDIT_SCHEMA_ID;
  return out;
}

/** The canonical signed bytes for an audit event. */
export function canonicalAuditBytes(event: Record<string, unknown>): Uint8Array {
  const signed = sortDeep(stripNulls(buildSignedObject(event)));
  return new TextEncoder().encode(JSON.stringify(signed));
}

/** §4.5: `payload_hash = SHA-256(canonical bytes)`, lowercase hex. */
export function payloadHashHex(canonical: Uint8Array): string {
  return createHash("sha256").update(canonical).digest("hex");
}

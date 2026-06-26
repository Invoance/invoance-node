/**
 * Offline, client-side signature verification for audit events.
 *
 * Reconstructs the canonical signed bytes from an event returned by the API and checks
 * the Ed25519 signature using Node's built-in `crypto` (no external dependency, matching
 * this SDK's zero-dependency design).
 *
 * Trust note: by default this verifies against the key embedded in the event
 * (`event.signing_public_key`), which proves the payload is internally consistent with
 * that key. An attacker with row-write access could re-sign a tampered event under their
 * OWN keypair and swap the embedded key too, and that would still pass. For a real tamper
 * guarantee, pass `publicKey` = the tenant's registered key (the server pins it from
 * `tenant_keys` and never trusts the row's key).
 */

import { createPublicKey, verify as cryptoVerify } from "node:crypto";

import { canonicalAuditBytes, payloadHashHex } from "./audit-canonical.js";

export interface AuditVerifyResult {
  valid: boolean;
  reason: string | null;
  payloadHash: string;
  keySource: "pinned" | "event";
}

// DER SPKI prefix for a raw 32-byte Ed25519 public key.
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function toBytes(k: string | Uint8Array): Buffer {
  return typeof k === "string" ? Buffer.from(k, "hex") : Buffer.from(k);
}

function ed25519Verify(message: Uint8Array, signature: Uint8Array, pubkey: Uint8Array): boolean {
  try {
    const der = Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(pubkey)]);
    const keyObject = createPublicKey({ key: der, format: "der", type: "spki" });
    return cryptoVerify(null, Buffer.from(message), keyObject, Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Verify one audit event's signature offline. See module docstring on trust. */
export function verifyAuditEvent(
  event: Record<string, unknown>,
  opts?: { publicKey?: string | Uint8Array },
): AuditVerifyResult {
  const keySource: "pinned" | "event" = opts?.publicKey != null ? "pinned" : "event";
  const e = event as Record<string, any>;

  const signedInput: Record<string, unknown> = {
    org_id: e.org_id,
    event_id: e.id ?? e.event_id,
    seq: e.seq,
    ingested_at: e.ingested_at,
    action: e.action,
    occurred_at: e.occurred_at,
    actor: e.actor,
    targets: e.targets,
  };
  if (e.context != null) signedInput.context = e.context;
  if (e.metadata != null) signedInput.metadata = e.metadata;

  let canonical: Uint8Array;
  try {
    canonical = canonicalAuditBytes(signedInput);
  } catch {
    return { valid: false, reason: "canonicalization_failed", payloadHash: "", keySource };
  }

  const recomputed = payloadHashHex(canonical);
  if (e.payload_hash != null && e.payload_hash !== recomputed) {
    return { valid: false, reason: "payload_hash_mismatch", payloadHash: recomputed, keySource };
  }

  const key = opts?.publicKey ?? e.signing_public_key;
  if (!key) return { valid: false, reason: "no_public_key", payloadHash: recomputed, keySource };
  if (!e.signature) return { valid: false, reason: "no_signature", payloadHash: recomputed, keySource };

  const sig = typeof e.signature === "string" ? Buffer.from(e.signature, "hex") : toBytes(e.signature);
  const ok = ed25519Verify(canonical, sig, toBytes(key));
  return ok
    ? { valid: true, reason: null, payloadHash: recomputed, keySource }
    : { valid: false, reason: "signature_invalid", payloadHash: recomputed, keySource };
}

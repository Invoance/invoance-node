# Invoance Node SDK

Official TypeScript/Node.js SDK for the [Invoance](https://invoance.com) compliance API — cryptographic proof, document anchoring, and AI attestation.

## Install

```bash
npm install invoance
```

Requires Node 18+.

## Quick start

Set your API key:

```bash
export INVOANCE_API_KEY=invoance_live_...
```

```ts
import { createHash } from "node:crypto";
import { InvoanceClient } from "invoance";

const client = new InvoanceClient();

// Ingest a compliance event
const event = await client.events.ingest({
  eventType: "policy.approval",
  payload: { policy_id: "pol_001", decision: "approved" },
});
console.log(event.event_id);

// Anchor a document by hash
const docBytes = Buffer.from("...your document bytes...");
const doc = await client.documents.anchor({
  documentHash: createHash("sha256").update(docBytes).digest("hex"),
  documentRef: "Invoice #1042",
});
console.log(doc.event_id);

// Or use the file helper (hashes + uploads in one call)
const anchored = await client.documents.anchorFile({
  file: "./invoice.pdf",
  documentRef: "Invoice #1042",
});

// Ingest an AI attestation
const att = await client.attestations.ingest({
  type: "output",
  input: "Summarize this contract",
  output: "The contract states...",
  modelProvider: "openai",
  modelName: "gpt-4o",
  modelVersion: "2025-01-01",
  subject: { userId: "u_42", sessionId: "sess_4f9a" },
});
console.log(att.attestation_id);
```

## Quick validation

Sanity-check that your API key works before wiring the SDK into a larger app:

```ts
const client = new InvoanceClient();
const { valid, reason, baseUrl } = await client.validate();
if (!valid) throw new Error(`Invoance: ${reason} (base: ${baseUrl})`);
```

`validate()` probes `GET /v1/events?limit=1`, never throws, and returns `{ valid, reason, baseUrl }` — use it in health checks, startup scripts, or CI guards.

One-liner for a terminal sanity check, no SDK install required:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $INVOANCE_API_KEY" \
  "${INVOANCE_BASE_URL:-https://api.invoance.com}/v1/events?limit=1"
# 200 = key valid · 401 = bad key · anything else = investigate
```

## Configuration

The client reads from environment variables automatically:

| Variable | Required | Default |
|---|---|---|
| `INVOANCE_API_KEY` | Yes | — |
| `INVOANCE_BASE_URL` | No | `https://api.invoance.com` |

You can also pass them explicitly:

```ts
const client = new InvoanceClient({
  apiKey: "invoance_live_...",
  timeoutMs: 60_000,
});
```

## Resources

Every resource is reached through an accessor on the client — `client.events`,
`client.documents`, `client.attestations`, `client.traces`, and `client.audit`.
All methods are `async` and return the server's JSON (typed where the SDK ships
a model). Method params use camelCase; the SDK maps them to the wire snake_case
for you.

### Events

```ts
// POST /events — ingest a compliance event.
const event = await client.events.ingest({
  eventType: "policy.approval",
  payload: { policy_id: "pol_001", decision: "approved" },
  eventTime: "2026-07-06T12:00:00Z", // optional
  traceId: "trc_...",                // optional — attach to a trace
  idempotencyKey: "idem_abc",        // optional — safe retries
});
console.log(event.event_id, event.ingested_at);

// GET /events — paginated listing (max limit 500, cached 30s).
const page = await client.events.list({
  page: 1,
  limit: 50,
  dateFrom: "2026-07-01",
  dateTo: "2026-07-06",
  eventType: "policy.approval",
});
console.log(page.total, page.has_more, page.events.length);

// GET /events/:eventId — fetch a single event with its full payload.
const one = await client.events.get(event.event_id);
console.log(one.payload_hash, one.event_hash);

// POST /events/:eventId/verify — hash verification.
// Provide EXACTLY ONE of `payloadHash` (hex SHA-256) or `payload`
// (raw JSON — the server canonicalizes and hashes it). Passing
// neither throws ValidationError before any request is sent.
const byHash = await client.events.verify(event.event_id, {
  payloadHash: "e3b0c442...",
});
const byPayload = await client.events.verify(event.event_id, {
  payload: { policy_id: "pol_001", decision: "approved" },
});
console.log(byHash.match_result, byPayload.matched_field);
```

### Documents

```ts
import { createHash } from "node:crypto";

// POST /document/anchor — anchor a document by its SHA-256 hash.
const bytes = Buffer.from("...document bytes...");
const anchored = await client.documents.anchor({
  documentHash: createHash("sha256").update(bytes).digest("hex"),
  documentRef: "Invoice #1042",       // optional
  eventType: "invoice",               // optional classification
  originalBytesB64: bytes.toString("base64"), // optional — store the original
  metadata: { amount: 5000 },         // optional
  traceId: "trc_...",                 // optional
  idempotencyKey: "idem_abc",         // optional
});
console.log(anchored.event_id, anchored.status);

// Convenience: hash + base64 a file, then anchor in one call.
// `file` accepts a path OR a Buffer/Uint8Array; `documentRef`
// defaults to the filename when a path is given.
const fromPath = await client.documents.anchorFile({
  file: "./invoice.pdf",
  documentRef: "Invoice #1042",
});
// Anchor a hash only, without uploading the original bytes:
const hashOnly = await client.documents.anchorFile({
  file: bytes,
  documentRef: "blob",
  skipOriginal: true,
});

// GET /document — paginated listing (max limit 500, cached 30s).
const docs = await client.documents.list({
  page: 1,
  limit: 50,
  documentRef: "Invoice",
});
console.log(docs.documents[0]?.has_original);

// GET /document/:eventId — fetch a single document record.
const doc = await client.documents.get(anchored.event_id);
console.log(doc.document_hash, doc.signature_b64);

// GET /document/:eventId/original — download original bytes (ArrayBuffer).
const original = await client.documents.getOriginal(anchored.event_id);
const buf = Buffer.from(original);

// POST /document/:eventId/verify — hash verification.
const check = await client.documents.verify(anchored.event_id, {
  documentHash: anchored.document_hash,
});
console.log(check.match_result, check.document_ref);
```

### AI Attestations

```ts
// POST /ai/attestations — anchor an AI attestation.
const att = await client.attestations.ingest({
  type: "output",
  input: "Summarize this contract",
  output: "The contract states...",
  modelProvider: "openai",
  modelName: "gpt-4o",
  modelVersion: "2025-01-01",
  subject: {                      // optional — userId/sessionId are well-known,
    userId: "u_42",               // any extra keys are kept as custom context.
    sessionId: "sess_4f9a",
    department: "legal",
  },
  traceId: "trc_...",             // optional
  idempotencyKey: "idem_abc",     // optional
});
console.log(att.attestation_id, att.input_hash, att.output_hash);

// GET /ai/attestations — paginated listing.
const list = await client.attestations.list({
  page: 1,
  limit: 50,
  attestationType: "output",
  modelProvider: "openai",
});
console.log(list.total, list.attestations.length);

// GET /ai/attestations/:id — fetch a single attestation.
const one = await client.attestations.get(att.attestation_id);
console.log(one.attestation_hash, one.signature_alg);

// POST /ai/attestations/:id/verify — hash verification.
const verified = await client.attestations.verify(att.attestation_id, {
  contentHash: att.payload_hash,
});
console.log(verified.match_result, verified.matched_field);

// GET /ai/attestations/:id/raw — the original canonical JSON payload.
const raw = await client.attestations.getRaw(att.attestation_id);
```

`verifyPayload` and `verifySignature` run entirely client-side — see
[Offline verification](#offline-verification) below.

### Traces

```ts
// POST /traces — create a new (open) trace.
const trace = await client.traces.create({
  label: "Invoice Processing — Q1 2026",
  metadata: { quarter: "Q1", year: 2026 }, // optional
});
console.log(trace.trace_id, trace.status);

// Attach items by passing `traceId` when you ingest/anchor:
await client.events.ingest({
  eventType: "invoice.received",
  payload: { invoice_number: "INV-2026-001" },
  traceId: trace.trace_id,
});

// GET /traces — paginated listing, optionally filtered by status.
const traces = await client.traces.list({ status: "open", limit: 50 });
console.log(traces.traces.length, traces.has_more);

// GET /traces/:traceId — detail with paginated events.
const detail = await client.traces.get(trace.trace_id, {
  event_page: 1,
  event_limit: 50,
});
console.log(detail.event_count, detail.events.length);

// POST /traces/:traceId/seal — seal a trace (async; returns 202).
const seal = await client.traces.seal(trace.trace_id);
console.log(seal.status, seal.message);

// GET /traces/:traceId/proof — proof bundle as JSON (sealed traces only).
const proof = await client.traces.proof(trace.trace_id);
console.log(proof.composite_hash, proof.verification.all_signatures_valid);

// GET /traces/:traceId/proof/pdf — proof bundle as a PDF (ArrayBuffer).
import { writeFileSync } from "node:fs";
const pdf = await client.traces.proofPdf(trace.trace_id);
writeFileSync("proof.pdf", Buffer.from(pdf));

// DELETE /traces/:traceId — delete an empty open trace.
const del = await client.traces.delete(trace.trace_id);
console.log(del.deleted);
```

### Audit logs

The audit-log surface is an append-only, per-tenant signed event ledger with
end-customer orgs, SIEM/webhook streams, hosted-viewer portal links, and async
exports. It lives under `client.audit` and is split into five sub-resources:
`events`, `orgs`, `streams`, `portalSessions`, and `exports`.

```ts
// ── client.audit.orgs ──────────────────────────────────────
// Register an end-customer org (your own external id).
await client.audit.orgs.create({ organizationId: "org_1", name: "Acme" });
await client.audit.orgs.list();
await client.audit.orgs.integrity("org_1");     // hash-chain integrity report
await client.audit.orgs.setRetention("org_1", 365); // retention window in days

// ── client.audit.events ────────────────────────────────────
// `occurredAt` defaults to now; the required Idempotency-Key is auto-derived
// from the event content when `idempotencyKey` is omitted.
const created = await client.audit.events.ingest({
  organizationId: "org_1",
  action: "invoice.approved",
  actor: { type: "user", id: "u_1", name: "Ada Lovelace" },
  targets: [{ type: "invoice", id: "inv_9" }], // optional
  context: { ip: "10.0.0.1" },                 // optional
  metadata: { source: "web" },                 // optional
});
const eventId = created.event_id as string;

const events = await client.audit.events.list({
  organizationId: "org_1",
  actions: "invoice.approved",
  actorId: "u_1",
  rangeStart: "2026-07-01T00:00:00Z",
  rangeEnd: "2026-07-06T00:00:00Z",
  limit: 100,
  cursor: undefined, // keyset pagination — pass the previous `next_cursor`
});
console.log(events.events.length, events.next_cursor);

const event = await client.audit.events.get(eventId);
await client.audit.events.verify(eventId); // server-side verify (pinned key)

// ── client.audit.streams ───────────────────────────────────
// Create a webhook stream; the signing secret is returned ONCE.
const stream = await client.audit.streams.create("org_1", {
  url: "https://siem.example/hook",
  type: "webhook", // optional — v1 supports "webhook" only
});
await client.audit.streams.list("org_1");
await client.audit.streams.test("org_1", stream.id as string);
await client.audit.streams.delete("org_1", stream.id as string);

// ── client.audit.portalSessions ────────────────────────────
// Mint a one-time hosted-viewer link.
const portal = await client.audit.portalSessions.create({
  organizationId: "org_1",
  intent: "audit_logs",           // or "log_streams"
  sessionDurationSeconds: 7200,   // optional (clamped 60..86400)
  linkDurationSeconds: 300,       // optional (clamped 60..3600)
});

// ── client.audit.exports ───────────────────────────────────
// Queue an async CSV/NDJSON export, then poll for the download URL.
const job = await client.audit.exports.create({
  organizationId: "org_1",
  format: "csv", // or "ndjson"
  filters: { action: "invoice.approved" }, // optional
});
const status = await client.audit.exports.get(job.id as string);
if (status.status === "ready") console.log(status.download_url);
```

## Offline verification

Prove that a record hasn't been tampered with — without trusting the server —
using Node's built-in `crypto` (no external dependency). Three entry points:

```ts
import { InvoanceClient, verifyAuditEvent } from "invoance";

const client = new InvoanceClient();

// ── attestations.verifySignature ───────────────────────────
// Fetches the attestation and checks its Ed25519 signature against the
// embedded signed_payload + public_key. Proves no field changed since
// ingestion (timestamps, hashes, metadata included).
const sig = await client.attestations.verifySignature("att_123");
if (!sig.valid) console.error(sig.reason);
console.log(sig.signedData); // the JSON covered by the signature

// ── attestations.verifyPayload ─────────────────────────────
// Hashes a payload client-side, then calls verify. Pass the canonical
// JSON exactly as shown in the dashboard's "Raw immutable record"
// viewer (string, Buffer, or object). Key order must match the server's
// struct order — the safest input is the raw JSON string.
const raw = await client.attestations.getRaw("att_123");
const payloadCheck = await client.attestations.verifyPayload("att_123", raw);
console.log(payloadCheck.match_result);

// ── verifyAuditEvent (standalone helper) ───────────────────
// Reconstructs the canonical signed bytes for an audit event and checks
// its Ed25519 signature offline.
const event = await client.audit.events.get("evt_123");
const result = verifyAuditEvent(event);
// => { valid, reason, payloadHash, keySource: "event" }

// By default this verifies against the key embedded in the event, which
// only proves internal consistency. For a real tamper guarantee, pin the
// tenant's registered public key:
const pinned = verifyAuditEvent(event, { publicKey: registeredHexKey });
// => keySource: "pinned"
```

The lower-level canonicalization helpers are also exported for advanced use:
`canonicalAuditBytes(event)` (the exact signed bytes), `payloadHashHex(bytes)`,
`normalizeTs(rfc3339)`, and the `AUDIT_SCHEMA_ID` constant. `contentIdempotencyKey(body)`
derives the stable Idempotency-Key the audit ledger uses.

## Error handling

Every error the SDK raises — API responses, network failures, client-side validation — inherits from `InvoanceError`:

```ts
import {
  InvoanceError,
  AuthenticationError,
  QuotaExceededError,
  ValidationError,
  TimeoutError,
  NetworkError,
} from "invoance";

try {
  await client.events.ingest({ eventType: "user.login", payload: {} });
} catch (e) {
  if (e instanceof AuthenticationError) {
    // 401 — bad API key
  } else if (e instanceof QuotaExceededError) {
    console.log(`rate limited, retry in ${e.retryAfterSeconds}s`);
  } else if (e instanceof ValidationError) {
    // 400 from server, or client-side input validation failure
  } else if (e instanceof TimeoutError) {
    // request exceeded configured timeoutMs
  } else if (e instanceof NetworkError) {
    // DNS/connection/TLS failure before a response
  } else if (e instanceof InvoanceError) {
    // any other API or transport failure
  } else {
    throw e;
  }
}
```

Common hex-SHA-256 fields (`documentHash`, `payloadHash`, `contentHash`) are validated client-side — passing a malformed hash throws `ValidationError` before a request is sent.

## Examples

```bash
npx tsx examples/events/ingest_event.ts
npx tsx examples/documents/anchor_document.ts ./invoice.pdf --ref "Invoice #1042"
npx tsx examples/ai_attestations/verify_signature.ts <attestation_id>
```

See the `examples/` directory for complete working examples covering events, documents, AI attestations, and traces.

## License

MIT

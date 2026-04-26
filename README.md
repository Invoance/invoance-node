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
# INVOANCE_BASE_URL is optional and defaults to https://api.invoance.com.
# Only set it if you're pointing at a self-hosted backend or local dev server.
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

// Self-hosted backend or local dev — override base URL:
const localClient = new InvoanceClient({
  apiKey: "invoance_live_...",
  baseUrl: "http://localhost:33100",
});
```

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

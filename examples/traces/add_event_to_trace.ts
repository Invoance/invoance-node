/**
 * Add an event to an existing open trace.
 *
 * Events are the building blocks of a trace. Each event is individually
 * hashed and signed, then linked to the trace by its trace_id. Once the
 * trace is sealed, all events become part of a single cryptographic proof.
 *
 * Run:  npx tsx examples/traces/add_event_to_trace.ts <trace_id>
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const traceId = process.argv[2];
  if (!traceId) {
    console.error("Usage: npx tsx examples/traces/add_event_to_trace.ts <trace_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();

  // Anchor an event to the trace
  const event = await client.events.ingest({
    eventType: "contract.signed",
    payload: {
      contract_id: "CTR-2026-042",
      signed_by: "legal@acme.com",
      counterparty: "vendor@example.com",
    },
    traceId,
  });

  console.log(`event_id:    ${event.event_id}`);
  console.log(`ingested_at: ${event.ingested_at}`);
  console.log(`trace_id:    ${traceId}`);
  console.log(`\nEvent anchored to trace. Note: events are processed`);
  console.log(`asynchronously — it may take a moment to appear in the trace.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

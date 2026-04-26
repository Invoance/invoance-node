/**
 * Complete end-to-end trace workflow:
 * 1. Create a trace
 * 2. Ingest 3 events with trace_id
 * 3. Seal the trace
 * 4. Poll until sealed
 * 5. Export the proof bundle
 *
 * Run:  npx tsx examples/traces/full_workflow.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const client = new InvoanceClient();

  console.log("Step 1: Creating trace...");
  const trace = await client.traces.create({
    label: "Invoice Processing — Q1 2026",
    metadata: {
      quarter: "Q1",
      year: 2026,
      department: "finance",
    },
  });
  const traceId = trace.trace_id;
  console.log(`  Created: ${traceId}\n`);

  console.log("Step 2: Ingesting events...");
  const event1 = await client.events.ingest({
    eventType: "invoice.received",
    payload: { invoice_number: "INV-2026-001", amount: 5000 },
    traceId,
  });
  console.log(`  Event 1 (invoice.received): ${event1.event_id}`);

  const event2 = await client.events.ingest({
    eventType: "invoice.approved",
    payload: { invoice_number: "INV-2026-001", approved_by: "manager@acme.com" },
    traceId,
  });
  console.log(`  Event 2 (invoice.approved): ${event2.event_id}`);

  const event3 = await client.events.ingest({
    eventType: "payment.authorized",
    payload: { invoice_number: "INV-2026-001", payment_id: "PAY-2026-0001" },
    traceId,
  });
  console.log(`  Event 3 (payment.authorized): ${event3.event_id}\n`);

  console.log("Step 3: Sealing trace...");
  await client.traces.seal(traceId);
  console.log(`  Seal request sent (async)\n`);

  console.log("Step 4: Polling for completion (max 30 seconds)...");
  let sealedTrace = await client.traces.get(traceId);
  let attempts = 0;
  const maxAttempts = 15;

  while (sealedTrace.status !== "sealed" && attempts < maxAttempts) {
    console.log(`  Status: ${sealedTrace.status} (${attempts + 1}/${maxAttempts})...`);
    await sleep(2000);
    sealedTrace = await client.traces.get(traceId);
    attempts++;
  }

  if (sealedTrace.status === "sealed") {
    console.log(`  Status: sealed (completed)\n`);
  } else {
    console.error(`  Timeout: trace not sealed after ${attempts * 2} seconds`);
    process.exit(1);
  }

  console.log("Step 5: Exporting proof bundle...");
  const proof = await client.traces.proof(traceId);
  console.log(`  Version:       ${proof.version}`);
  console.log(`  Event count:   ${proof.event_count}`);
  console.log(`  Composite hash: ${proof.composite_hash.slice(0, 32)}...\n`);

  console.log("── Summary ──");
  console.log(`Trace ID:    ${proof.trace_id}`);
  console.log(`Label:       ${proof.label}`);
  console.log(`Status:      ${proof.status}`);
  console.log(`Events:      ${proof.event_count}`);
  console.log(`Created:     ${proof.created_at}`);
  console.log(`Sealed:      ${proof.sealed_at}`);
  console.log(`Domain:      ${proof.tenant_domain}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

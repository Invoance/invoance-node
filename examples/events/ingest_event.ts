/**
 * Ingest a compliance event into the append-only ledger.
 *
 * Run:  npx tsx examples/events/ingest_event.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const client = new InvoanceClient();

  const result = await client.events.ingest({
    eventType: "policy.approval",
    payload: {
      policy_id: "pol_8472",
      approved_by: "risk_committee",
      decision: "approved",
    },
  });

  console.log(`event_id:    ${result.event_id}`);
  console.log(`ingested_at: ${result.ingested_at}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

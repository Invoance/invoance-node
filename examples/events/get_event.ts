/**
 * Retrieve an event by ID and display details.
 *
 * Run:  npx tsx examples/events/get_event.ts <event_id>
 *
 * Example:
 *   npx tsx examples/events/get_event.ts a0f43089-4cfc-483e-a8e5-57c10130fcfc
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.error("Usage: npx tsx examples/events/get_event.ts <event_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const event = await client.events.get(eventId);

  console.log(`event_id:     ${event.event_id}`);
  console.log(`event_type:   ${event.event_type}`);
  console.log(`payload_hash: ${event.payload_hash}`);
  console.log(`event_hash:   ${event.event_hash}`);
  console.log(`ingested_at:  ${event.ingested_at}`);
  console.log(`payload:      ${JSON.stringify(event.payload)}`);

  const org = event.organization;
  if (org) {
    console.log(`\n── Issuer ──`);
    console.log(`  name:            ${org.name}`);
    console.log(`  issuer_name:     ${org.issuer_name}`);
    console.log(`  domain:          ${org.primary_domain}`);
    console.log(`  domain_verified: ${org.domain_verified}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

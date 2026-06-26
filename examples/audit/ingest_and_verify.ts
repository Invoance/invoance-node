/**
 * Audit Logs: ingest an event, read it back, and verify its signature OFFLINE.
 *
 * Run:  npx tsx examples/audit/ingest_and_verify.ts <organization_id>
 *
 * The event is signed server-side; we read it back and check the Ed25519 signature
 * client-side with `verifyAuditEvent` — no second round-trip needed to trust the row.
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient, verifyAuditEvent } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const organizationId = process.argv[2];
  if (!organizationId) {
    console.error("Usage: npx tsx examples/audit/ingest_and_verify.ts <organization_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();

  // occurredAt defaults to now and the Idempotency-Key is auto-derived from the event
  // content, so a bare ingest() just works. For idempotent retries, pin both occurredAt
  // and idempotencyKey: contentIdempotencyKey(yourFullBody).
  const created = await client.audit.events.ingest({
    organizationId,
    action: "user.signed_in",
    actor: { type: "user", id: "u_42", name: "Ada Lovelace" },
    targets: [{ type: "doc", id: "d_1" }],
  });
  const eventId = created.event_id as string;
  console.log(`ingested ${eventId}`);

  // The signer is async; poll the read until the row is persisted.
  let event: Record<string, unknown> | undefined;
  for (let i = 0; i < 20; i++) {
    try {
      event = await client.audit.events.get(eventId);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!event) {
    console.error("event did not persist in time");
    process.exit(1);
  }

  // Verify OFFLINE. Pin the tenant key with { publicKey } for a real tamper guarantee.
  const result = verifyAuditEvent(event);
  console.log(`offline verify: valid=${result.valid} reason=${result.reason} keySource=${result.keySource}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

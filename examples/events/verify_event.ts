/**
 * Verify an event — by hash or by re-submitting the original payload.
 *
 * Run:  npx tsx examples/events/verify_event.ts <event_id> '<payload_json>'
 *
 * Example:
 *   npx tsx examples/events/verify_event.ts a0f43089-4cfc-483e-a8e5-57c10130fcfc \
 *     '{"policy_id":"pol_8472","approved_by":"risk_committee","decision":"approved"}'
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  if (process.argv.length < 4) {
    console.error("Usage: npx tsx examples/events/verify_event.ts <event_id> '<payload_json>'");
    console.error("\nExample:");
    console.error(
      '  npx tsx examples/events/verify_event.ts a0f43089-... \'{"policy_id":"pol_8472","decision":"approved"}\''
    );
    process.exit(1);
  }

  const eventId = process.argv[2];
  const rawJson = process.argv.slice(3).join(" ");
  let payload: unknown;

  try {
    payload = JSON.parse(rawJson);
  } catch (err) {
    console.error(`Error: invalid JSON payload: ${err}`);
    process.exit(1);
  }

  const client = new InvoanceClient();

  // ── Verify by re-submitting the raw payload ──
  const r1 = await client.events.verify(eventId, {
    payload: payload as Record<string, unknown>,
  });
  console.log("── Verify by payload ──");
  console.log(`  match_result: ${r1.match_result}`);
  console.log(`  method:       ${r1.method}`);
  console.log(`  anchored_at:  ${r1.anchored_at}`);

  // ── Verify by pre-computed hash ──
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(payload, null, 0).split("").sort().join(""))
    .digest("hex");

  const r2 = await client.events.verify(eventId, {
    payloadHash,
  });
  console.log("\n── Verify by hash ──");
  console.log(`  match_result:   ${r2.match_result}`);
  console.log(`  method:         ${r2.method}`);
  console.log(`  anchored_hash:  ${r2.anchored_hash}`);
  console.log(`  submitted_hash: ${r2.submitted_hash}`);

  const org = r2.organization;
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

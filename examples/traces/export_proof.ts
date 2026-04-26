/**
 * Export the proof bundle for a sealed trace.
 *
 * Run:  npx tsx examples/traces/export_proof.ts <trace_id>
 *
 * Example:
 *   npx tsx examples/traces/export_proof.ts tr_a1b2c3d4e5f6
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const traceId = process.argv[2] || process.env.TRACE_ID;

  if (!traceId) {
    console.error("Usage: npx tsx examples/traces/export_proof.ts <trace_id>");
    console.error("       Or set TRACE_ID environment variable");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const proof = await client.traces.proof(traceId);

  console.log(`version:         ${proof.version}`);
  console.log(`trace_id:        ${proof.trace_id}`);
  console.log(`label:           ${proof.label}`);
  console.log(`status:          ${proof.status}`);
  console.log(`event_count:     ${proof.event_count}`);
  console.log(`created_at:      ${proof.created_at}`);
  console.log(`sealed_at:       ${proof.sealed_at}`);
  console.log(`composite_hash:  ${proof.composite_hash.slice(0, 32)}...`);
  console.log(`tenant_domain:   ${proof.tenant_domain}`);

  // Save the proof bundle as JSON
  const filename = `proof_${proof.trace_id}.json`;
  writeFileSync(filename, JSON.stringify(proof, null, 2));
  console.log(`\nProof bundle saved to: ${filename}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

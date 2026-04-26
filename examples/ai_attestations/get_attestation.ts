/**
 * Retrieve an AI attestation by ID.
 *
 * Run:  npx tsx examples/ai_attestations/get_attestation.ts <attestation_id>
 *
 * Example:
 *   npx tsx examples/ai_attestations/get_attestation.ts att_a1b2c3d4e5f6
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const attestationId = process.argv[2];

  if (!attestationId) {
    console.error("Usage: npx tsx examples/ai_attestations/get_attestation.ts <attestation_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const att = await client.attestations.get(attestationId);

  console.log(`attestation_id: ${att.attestation_id}`);
  console.log(`type:           ${att.attestation_type}`);
  console.log(`model_provider: ${att.model_provider}`);
  console.log(`model_name:     ${att.model_name}`);
  console.log(`model_version:  ${att.model_version}`);
  console.log(`hash:           ${att.attestation_hash.slice(0, 32)}...`);
  console.log(`created_at:     ${att.created_at}`);

  const org = att.organization;
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

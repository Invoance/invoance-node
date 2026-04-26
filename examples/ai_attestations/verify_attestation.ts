/**
 * Verify an attestation by content hash.
 *
 * Run:  npx tsx examples/ai_attestations/verify_attestation.ts <attestation_id> <content_hash>
 *
 * Example:
 *   npx tsx examples/ai_attestations/verify_attestation.ts att_a1b2c3d4e5f6 \
 *     abc123def456...
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const attestationId = process.argv[2];
  const contentHash = process.argv[3];

  if (!attestationId || !contentHash) {
    console.error(
      "Usage: npx tsx examples/ai_attestations/verify_attestation.ts <attestation_id> <content_hash>"
    );
    process.exit(1);
  }

  const client = new InvoanceClient();
  const result = await client.attestations.verify(attestationId, {
    contentHash,
  });

  console.log(`attestation_id: ${result.attestation_id}`);
  console.log(`match_result:   ${result.match_result}`);
  console.log(`matched_field:  ${result.matched_field}`);
  console.log(`anchored_hash:  ${result.anchored_hash}`);
  console.log(`submitted_hash: ${result.submitted_hash}`);
  console.log(`anchored_at:    ${result.anchored_at}`);

  const org = result.organization;
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

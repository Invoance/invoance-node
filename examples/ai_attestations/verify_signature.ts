/**
 * Verify the Ed25519 signature of an AI attestation — fully client-side.
 *
 * This proves that no field has been tampered with since ingestion,
 * including the timestamp, hashes, and all metadata. No trust in
 * the server is required.
 *
 * Run:  npx tsx examples/ai_attestations/verify_signature.ts <attestation_id>
 *
 * Example:
 *   npx tsx examples/ai_attestations/verify_signature.ts att_a1b2c3d4e5f6
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
    console.error(
      "Usage: npx tsx examples/ai_attestations/verify_signature.ts <attestation_id>"
    );
    process.exit(1);
  }

  const client = new InvoanceClient();
  const result = await client.attestations.verifySignature(attestationId);

  console.log(`valid:          ${result.valid}`);
  console.log(`reason:         ${result.reason}`);
  console.log(`attestation_id: ${result.attestation.attestation_id}`);
  console.log(`signature_alg:  ${result.attestation.signature_alg}`);

  if (result.signed_data) {
    console.log(`\n── Signed data (tamper-proof fields) ──`);
    console.log(JSON.stringify(result.signed_data, null, 2));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

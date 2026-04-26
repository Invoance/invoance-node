/**
 * Retrieve raw attestation JSON.
 *
 * Run:  npx tsx examples/ai_attestations/get_raw_attestation.ts <attestation_id>
 *
 * Example:
 *   npx tsx examples/ai_attestations/get_raw_attestation.ts att_a1b2c3d4e5f6
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
      "Usage: npx tsx examples/ai_attestations/get_raw_attestation.ts <attestation_id>"
    );
    process.exit(1);
  }

  const client = new InvoanceClient();
  const raw = await client.attestations.getRaw(attestationId);

  console.log(JSON.stringify(raw, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

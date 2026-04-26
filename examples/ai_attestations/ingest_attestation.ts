/**
 * Ingest an AI attestation — anchor an AI input/output pair.
 *
 * Run:  npx tsx examples/ai_attestations/ingest_attestation.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const client = new InvoanceClient();

  const result = await client.attestations.ingest({
    type: "output",
    input: "Summarize Q1 2026 revenue figures.",
    output: "Q1 2026 revenue was $12.4M, up 18% year-over-year.",
    modelProvider: "openai",
    modelName: "gpt-4.1",
    modelVersion: "2026-04-14",
    subject: {
      userId: "user_7b1c",
      sessionId: "sess_4f9a",
      // Custom fields — any key-value pairs your org needs
      department: "finance",
      request_id: "req_a8c3e1",
    },
  });

  console.log(`attestation_id: ${result.attestation_id}`);
  console.log(`created_at:     ${result.created_at}`);
  console.log(`payload_hash:   ${result.payload_hash}`);
  console.log(`input_hash:     ${result.input_hash}`);
  console.log(`output_hash:    ${result.output_hash}`);
  console.log(`status:         ${result.status}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

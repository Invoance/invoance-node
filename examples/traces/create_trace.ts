/**
 * Create a new trace with label and metadata.
 *
 * Run:  npx tsx examples/traces/create_trace.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const client = new InvoanceClient();

  const trace = await client.traces.create({
    label: "Vendor Onboarding — Acme Corp",
    metadata: {
      department: "procurement",
      initiated_by: "j.smith@acme.com",
    },
  });

  console.log(`trace_id:  ${trace.trace_id}`);
  console.log(`status:    ${trace.status}`);
  console.log(`created_at: ${trace.created_at}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

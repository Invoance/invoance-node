/**
 * Seal a trace (async operation, returns 202).
 *
 * Run:  npx tsx examples/traces/seal_trace.ts <trace_id>
 *
 * Example:
 *   npx tsx examples/traces/seal_trace.ts tr_a1b2c3d4e5f6
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const traceId = process.argv[2] || process.env.TRACE_ID;

  if (!traceId) {
    console.error("Usage: npx tsx examples/traces/seal_trace.ts <trace_id>");
    console.error("       Or set TRACE_ID environment variable");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const result = await client.traces.seal(traceId);

  console.log(`status:  ${result.status}`);
  console.log(`message: ${result.message}`);
  console.log("");
  console.log("Note: Sealing is asynchronous. Use get_trace.ts to poll the");
  console.log("      trace status until it transitions to 'sealed'.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

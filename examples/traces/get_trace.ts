/**
 * Get a single trace by ID and print its details.
 *
 * Run:  npx tsx examples/traces/get_trace.ts <trace_id>
 *
 * Example:
 *   npx tsx examples/traces/get_trace.ts tr_a1b2c3d4e5f6
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
    console.error("Usage: npx tsx examples/traces/get_trace.ts <trace_id>");
    console.error("       Or set TRACE_ID environment variable");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const trace = await client.traces.get(traceId);

  console.log(`trace_id:       ${trace.trace_id}`);
  console.log(`label:          ${trace.label}`);
  console.log(`status:         ${trace.status}`);
  console.log(`event_count:    ${trace.event_count ?? 0}`);
  console.log(`created_at:     ${trace.created_at}`);
  console.log(`sealed_at:      ${trace.sealed_at ?? "not sealed"}`);

  if (trace.composite_hash) {
    console.log(`composite_hash: ${trace.composite_hash.slice(0, 32)}...`);
  }

  if (trace.events && trace.events.length > 0) {
    console.log("\n── Events ──");
    for (const event of trace.events) {
      console.log(`  ${event.event_type} (${event.event_id.slice(0, 16)}...)`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

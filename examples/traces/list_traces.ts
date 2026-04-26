/**
 * List open traces with pagination.
 *
 * Run:  npx tsx examples/traces/list_traces.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const client = new InvoanceClient();

  const result = await client.traces.list({
    page: 1,
    limit: 10,
    status: "open",
  });

  console.log(`Total traces: ${result.total}`);
  console.log(`Page: ${result.page}, Limit: ${result.limit}`);
  console.log(`Has more: ${result.has_more}`);
  console.log("");

  for (const trace of result.traces) {
    console.log(`trace_id:  ${trace.trace_id}`);
    console.log(`label:     ${trace.label}`);
    console.log(`status:    ${trace.status}`);
    console.log(`events:    ${trace.event_count ?? 0}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

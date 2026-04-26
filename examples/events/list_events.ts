/**
 * Paginated event listing with optional filters.
 *
 * Run:  npx tsx examples/events/list_events.ts
 *       npx tsx examples/events/list_events.ts --limit 5
 *       npx tsx examples/events/list_events.ts --limit 20 --page 2 --event-type policy.approval
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

/**
 * Simple argument parser for --flag value style arguments.
 */
function parseArgs(): Record<string, string | number | boolean> {
  const args: Record<string, string | number | boolean> = {
    page: 1,
    limit: 10,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = process.argv[i + 1];

      if (value && !value.startsWith("--")) {
        if (key === "page" || key === "limit") {
          args[key] = parseInt(value, 10);
        } else {
          args[key] = value;
        }
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  return args;
}

async function main() {
  const parsed = parseArgs();

  const client = new InvoanceClient();
  const page = await client.events.list({
    page: parsed.page as number,
    limit: parsed.limit as number,
    eventType: parsed["event-type"] as string | undefined,
  });

  console.log(`Total events: ${page.total}`);
  console.log(`Page ${page.page}, has_more: ${page.has_more}\n`);

  for (const e of page.events) {
    console.log(
      `  ${e.event_id}  type=${e.event_type}  hash=${e.payload_hash.slice(0, 16)}...`
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

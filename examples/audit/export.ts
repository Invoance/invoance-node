/**
 * Audit Logs: create an async export and poll until the download URL is ready.
 *
 * Run:  npx tsx examples/audit/export.ts <organization_id> [csv|ndjson]
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const organizationId = process.argv[2];
  const format = (process.argv[3] as "csv" | "ndjson") ?? "csv";
  if (!organizationId) {
    console.error("Usage: npx tsx examples/audit/export.ts <organization_id> [csv|ndjson]");
    process.exit(1);
  }

  const client = new InvoanceClient();

  const job = await client.audit.exports.create({ organizationId, format });
  const exportId = job.id as string;
  console.log(`queued export ${exportId} (${format})`);

  let status = job;
  for (let i = 0; i < 30; i++) {
    status = await client.audit.exports.get(exportId);
    if (status.status === "ready" || status.status === "failed") break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`status: ${status.status} rows=${status.row_count} error=${status.error ?? ""}`);
  if (status.download_url) console.log(`download: ${status.download_url}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

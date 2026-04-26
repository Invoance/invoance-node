/**
 * Download the original file for an anchored document.
 *
 * Run:  npx tsx examples/documents/get_document_original.ts <event_id>
 *
 * Example:
 *   npx tsx examples/documents/get_document_original.ts a0f43089-4cfc-483e-a8e5-57c10130fcfc
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.error("Usage: npx tsx examples/documents/get_document_original.ts <event_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const data = await client.documents.getOriginal(eventId);

  console.log(`Downloaded ${data.length} bytes`);
  console.log(`First 200 bytes: ${data.slice(0, 200).toString("utf8")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

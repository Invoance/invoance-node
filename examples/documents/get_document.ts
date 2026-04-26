/**
 * Retrieve a document by event ID.
 *
 * Run:  npx tsx examples/documents/get_document.ts <event_id>
 *
 * Example:
 *   npx tsx examples/documents/get_document.ts a0f43089-4cfc-483e-a8e5-57c10130fcfc
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
    console.error("Usage: npx tsx examples/documents/get_document.ts <event_id>");
    process.exit(1);
  }

  const client = new InvoanceClient();
  const doc = await client.documents.get(eventId);

  console.log(`event_id:       ${doc.event_id}`);
  console.log(`document_ref:   ${doc.document_ref}`);
  console.log(`document_hash:  ${doc.document_hash}`);
  console.log(`has_original:   ${doc.has_original}`);
  console.log(`created_at:     ${doc.created_at}`);
  if (doc.metadata) console.log(`metadata:       ${JSON.stringify(doc.metadata)}`);

  const org = doc.organization;
  if (org) {
    console.log(`\n── Issuer ──`);
    console.log(`  name:            ${org.name}`);
    console.log(`  issuer_name:     ${org.issuer_name}`);
    console.log(`  domain:          ${org.primary_domain}`);
    console.log(`  domain_verified: ${org.domain_verified}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

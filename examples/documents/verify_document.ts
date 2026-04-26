/**
 * Verify a document by hash.
 *
 * Run:  npx tsx examples/documents/verify_document.ts <event_id> <document_hash>
 *
 * Example:
 *   npx tsx examples/documents/verify_document.ts a0f43089-4cfc-483e-a8e5-57c10130fcfc \
 *     abc123def456...
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

async function main() {
  const eventId = process.argv[2];
  const documentHash = process.argv[3];

  if (!eventId || !documentHash) {
    console.error(
      "Usage: npx tsx examples/documents/verify_document.ts <event_id> <document_hash>"
    );
    process.exit(1);
  }

  const client = new InvoanceClient();
  const result = await client.documents.verify(eventId, {
    documentHash,
  });

  console.log(`event_id:       ${result.event_id}`);
  console.log(`match_result:   ${result.match_result}`);
  console.log(`document_ref:   ${result.document_ref}`);
  console.log(`anchored_hash:  ${result.anchored_hash}`);
  console.log(`submitted_hash: ${result.submitted_hash}`);
  console.log(`anchored_at:    ${result.anchored_at}`);

  const org = result.organization;
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

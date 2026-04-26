/**
 * Quickstart – exercise every endpoint against a local backend.
 *
 * Run:  npx tsx examples/quickstart.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { InvoanceClient } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const client = new InvoanceClient();

  // ── Events ────────────────────────────────────────────────
  console.log("=== Events ===");

  const event = await client.events.ingest({
    eventType: "user.login",
    payload: { user_id: "u_42", ip: "192.168.1.1" },
  });
  console.log(`  Ingested event: ${event.event_id}`);

  const fetched = await client.events.get(event.event_id);
  console.log(`  Fetched event type: ${fetched.event_type}`);

  const listing = await client.events.list({ limit: 5 });
  console.log(`  Listed events: ${listing.total} total, page ${listing.page}`);

  const verification = await client.events.verify(event.event_id, {
    payload: { user_id: "u_42", ip: "192.168.1.1" },
  });
  console.log(
    `  Verify match: ${verification.match_result} (${verification.method})`,
  );

  // ── Documents ─────────────────────────────────────────────
  console.log("\n=== Documents ===");

  const content = Buffer.from("Hello, Invoance!");
  const docHash = createHash("sha256").update(content).digest("hex");

  const doc = await client.documents.anchor({
    documentHash: docHash,
    documentRef: "hello.txt",
    eventType: "document_upload",
  });
  console.log(`  Anchored document: ${doc.event_id}`);

  const docDetail = await client.documents.get(doc.event_id);
  console.log(`  Document ref: ${docDetail.document_ref}`);

  const docList = await client.documents.list({ limit: 5 });
  console.log(`  Listed docs: ${docList.total} total`);

  const docVerify = await client.documents.verify(doc.event_id, {
    documentHash: docHash,
  });
  console.log(`  Verify match: ${docVerify.match_result}`);

  // ── AI Attestations ───────────────────────────────────────
  console.log("\n=== AI Attestations ===");

  const att = await client.attestations.ingest({
    type: "output",
    input: "What is 2+2?",
    output: "4",
    modelProvider: "openai",
    modelName: "gpt-4o",
    modelVersion: "2025-01-01",
    userId: "u_42",
  });
  console.log(`  Attestation: ${att.attestation_id}`);

  const attDetail = await client.attestations.get(att.attestation_id);
  console.log(
    `  Type: ${attDetail.attestation_type}, hash: ${attDetail.attestation_hash.slice(0, 16)}...`,
  );

  const attList = await client.attestations.list({ limit: 5 });
  console.log(`  Listed attestations: ${attList.total} total`);

  const attVerify = await client.attestations.verify(att.attestation_id, {
    contentHash: att.payload_hash,
  });
  console.log(`  Verify match: ${attVerify.match_result}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

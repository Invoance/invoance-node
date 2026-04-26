/**
 * Anchor a document in the immutable ledger.
 *
 * Uses `anchorFile()` — the SDK reads the file, computes the SHA-256
 * hash, and uploads the original bytes automatically.
 *
 * Run:  npx tsx examples/documents/anchor_document.ts <file_path>
 *       npx tsx examples/documents/anchor_document.ts <file_path> --ref "Invoice #1042"
 *       npx tsx examples/documents/anchor_document.ts <file_path> --ref "Contract v2" --type contract
 *       npx tsx examples/documents/anchor_document.ts <file_path> --metadata '{"amount": 5230, "currency": "USD"}'
 *
 * Example:
 *   npx tsx examples/documents/anchor_document.ts ./invoice.pdf --ref "Invoice #1042" \
 *     --metadata '{"amount": 5230, "currency": "USD"}'
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { InvoanceClient, ConflictError } from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

/**
 * Simple argument parser for --flag value style arguments.
 */
function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = process.argv[i + 1];

      if (value && !value.startsWith("--")) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    } else if (!args.file) {
      args.file = arg;
    }
  }

  return args;
}

async function main() {
  const parsed = parseArgs();
  const filePath = parsed.file as string;

  if (!filePath) {
    console.error("Usage: npx tsx examples/documents/anchor_document.ts <file_path>");
    console.error("  --ref <ref>               Human-readable document reference");
    console.error("  --type <type>             Event type (e.g., invoice, contract)");
    console.error("  --metadata <json>         JSON metadata");
    console.error("  --no-upload               Skip uploading original bytes");
    process.exit(1);
  }

  let metadata: Record<string, unknown> | undefined;
  if (parsed.metadata && typeof parsed.metadata === "string") {
    try {
      metadata = JSON.parse(parsed.metadata);
    } catch (err) {
      console.error(`Error: invalid --metadata JSON: ${err}`);
      process.exit(1);
    }
  }

  const client = new InvoanceClient();

  try {
    const result = await client.documents.anchorFile({
      file: resolve(filePath),
      documentRef: parsed.ref as string | undefined,
      eventType: parsed.type as string | undefined,
      metadata,
      skipOriginal: parsed["no-upload"] === true,
    });

    console.log(`event_id:      ${result.event_id}`);
    console.log(`document_hash: ${result.document_hash}`);
    console.log(`status:        ${result.status}`);
    console.log(`created_at:    ${result.created_at}`);
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log(`Already anchored: ${err}`);
      process.exit(0);
    }
    throw err;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

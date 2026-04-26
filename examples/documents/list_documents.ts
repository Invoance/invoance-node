/**
 * Paginated document listing with optional filters.
 *
 * Run:  npx tsx examples/documents/list_documents.ts
 *       npx tsx examples/documents/list_documents.ts --limit 5
 *       npx tsx examples/documents/list_documents.ts --limit 20 --page 2 --document-ref "Invoice"
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
  const page = await client.documents.list({
    page: parsed.page as number,
    limit: parsed.limit as number,
    documentRef: parsed["document-ref"] as string | undefined,
  });

  console.log(`Total documents: ${page.total}`);
  console.log(`Page ${page.page}, has_more: ${page.has_more}\n`);

  for (const d of page.documents) {
    console.log(
      `  ${d.event_id}  ref=${d.document_ref}  hash=${d.document_hash.slice(0, 16)}...`
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

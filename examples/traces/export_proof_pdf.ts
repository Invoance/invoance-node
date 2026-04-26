/**
 * Export the proof bundle as a PDF for a sealed trace.
 *
 * Usage:
 *   npx tsx examples/traces/export_proof_pdf.ts <trace_id>
 */

import { InvoanceClient } from "../../src/index.js";
import { writeFileSync } from "node:fs";

const traceId = process.argv[2] ?? process.env.TRACE_ID;

if (!traceId) {
  console.error("Usage: npx tsx examples/traces/export_proof_pdf.ts <trace_id>");
  console.error("       Or set TRACE_ID environment variable");
  process.exit(1);
}

const client = new InvoanceClient();

try {
  const pdfBuffer = await client.traces.proofPdf(traceId);

  const filename = `proof_${traceId}.pdf`;
  writeFileSync(filename, Buffer.from(pdfBuffer));

  console.log(`PDF proof bundle saved to: ${filename}`);
  console.log(`Size: ${pdfBuffer.byteLength.toLocaleString()} bytes`);
} catch (err: any) {
  console.error(`\n✗ ${err.constructor.name}: ${err.message}`);
  process.exit(1);
}

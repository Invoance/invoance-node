/**
 * Documents resource – `client.documents.*`
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";

import type { HttpTransport } from "../http.js";
import { assertSha256Hex } from "../validate.js";
import type {
  AnchorDocumentParams,
  AnchorFileParams,
  AnchorDocumentResponse,
  ListDocumentsParams,
  ListDocumentsResponse,
  DocumentEvent,
  VerifyDocumentParams,
  VerifyDocumentResponse,
} from "../models/documents.js";

export class DocumentsResource {
  constructor(private readonly t: HttpTransport) {}

  /** POST /document/anchor – Anchor a document hash. */
  async anchor(params: AnchorDocumentParams): Promise<AnchorDocumentResponse> {
    assertSha256Hex("documentHash", params.documentHash);
    const body: Record<string, unknown> = {
      document_hash: params.documentHash,
    };
    if (params.documentRef != null) body.document_ref = params.documentRef;
    if (params.eventType != null) body.event_type = params.eventType;
    if (params.originalBytesB64 != null) body.original_bytes_b64 = params.originalBytesB64;
    if (params.metadata != null) body.metadata = params.metadata;
    if (params.traceId != null) body.trace_id = params.traceId;

    return this.t.post<AnchorDocumentResponse>(
      "/document/anchor",
      body,
      params.idempotencyKey,
    );
  }

  /**
   * Convenience helper — reads a file (path or buffer), computes the
   * SHA-256 hash, base64-encodes the bytes, and calls `anchor()`.
   *
   * ```ts
   * const result = await client.documents.anchorFile({
   *   file: "./invoice.pdf",
   *   documentRef: "Invoice #1042",
   * });
   * ```
   */
  async anchorFile(params: AnchorFileParams): Promise<AnchorDocumentResponse> {
    const content =
      typeof params.file === "string"
        ? readFileSync(params.file)
        : Buffer.from(params.file);

    const documentHash = createHash("sha256").update(content).digest("hex");

    const documentRef =
      params.documentRef ??
      (typeof params.file === "string" ? basename(params.file) : undefined);

    return this.anchor({
      documentHash,
      documentRef,
      eventType: params.eventType,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey,
      originalBytesB64: params.skipOriginal ? undefined : content.toString("base64"),
      traceId: params.traceId,
    });
  }

  /** GET /document – Paginated document listing (max 500, cached 30s). */
  async list(params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
    return this.t.get<ListDocumentsResponse>("/document", {
      page: params.page,
      limit: params.limit,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      document_ref: params.documentRef,
    });
  }

  /** GET /document/:eventId – Retrieve a single document. */
  async get(eventId: string): Promise<DocumentEvent> {
    return this.t.get<DocumentEvent>(`/document/${eventId}`);
  }

  /**
   * GET /document/:eventId/original – Download the original document
   * file as raw bytes. Cached server-side for 5 minutes.
   *
   * Returns an `ArrayBuffer` — use `Buffer.from(result)` if you need
   * a Node Buffer.
   */
  async getOriginal(eventId: string): Promise<ArrayBuffer> {
    return this.t.getBytes(`/document/${eventId}/original`);
  }

  /** POST /document/:eventId/verify – Hash verification. */
  async verify(
    eventId: string,
    params: VerifyDocumentParams,
  ): Promise<VerifyDocumentResponse> {
    assertSha256Hex("documentHash", params.documentHash);
    return this.t.post<VerifyDocumentResponse>(
      `/document/${eventId}/verify`,
      { document_hash: params.documentHash },
    );
  }
}

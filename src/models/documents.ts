import type { OrganizationPublic } from "./index.js";

// ── Documents ───────────────────────────────────────────────

export interface AnchorDocumentParams {
  documentHash: string;
  documentRef?: string;
  eventType?: string;
  originalBytesB64?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Optional trace ID to associate this document with a trace. */
  traceId?: string;
}

export interface AnchorFileParams {
  /** File path on disk, OR a Buffer / Uint8Array of file contents. */
  file: string | Buffer | Uint8Array;
  /** Human-readable reference. Defaults to filename when a path is given. */
  documentRef?: string;
  /** Classification string (e.g. "invoice", "contract"). */
  eventType?: string;
  /** Arbitrary JSON metadata attached to the anchor. */
  metadata?: Record<string, unknown>;
  /** Idempotency key for safe retries. */
  idempotencyKey?: string;
  /** Skip uploading the original file bytes. Default: false. */
  skipOriginal?: boolean;
  /** Optional trace ID to associate this document with a trace. */
  traceId?: string;
}

export interface AnchorDocumentResponse {
  event_id: string;
  created_at: string;
  document_hash: string;
  status: string;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  documentRef?: string;
}

export interface DocumentListItem {
  event_id: string;
  document_ref: string;
  document_hash: string;
  event_type: string;
  has_original: boolean;
  created_at: string;
}

export interface ListDocumentsResponse {
  documents: DocumentListItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface DocumentEvent {
  event_id: string;
  tenant_id: string;
  document_ref: string;
  document_hash: string;
  signature_b64: string;
  signed_payload_b64: string;
  public_key_b64: string;
  has_original: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  organization?: OrganizationPublic;
}

export interface VerifyDocumentParams {
  documentHash: string;
}

export interface VerifyDocumentResponse {
  event_id: string;
  match_result: boolean;
  document_ref: string;
  anchored_hash: string;
  submitted_hash: string;
  anchored_at: string;
  organization?: OrganizationPublic;
}

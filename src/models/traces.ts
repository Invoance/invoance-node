import type { OrganizationPublic } from "./index.js";

// ── Traces ──────────────────────────────────────────────────

export interface CreateTraceParams {
  label: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTraceResponse {
  trace_id: string;
  status: string;
  created_at: string;
  label: string;
}

export interface ListTracesParams {
  page?: number;
  limit?: number;
  status?: "open" | "sealed";
}

export interface TraceListItem {
  trace_id: string;
  label: string;
  status: string;
  event_count: number | null;
  created_at: string;
  sealed_at: string | null;
  composite_hash: string | null;
}

export interface ListTracesResponse {
  traces: TraceListItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface TraceEventSummary {
  event_id: string;
  event_type: string;
  payload_hash: string;
  ingested_at: string;
}

export interface GetTraceParams {
  /** Page number for events (1-based, default 1) */
  event_page?: number;
  /** Max events per page (default 50, max 200) */
  event_limit?: number;
}

export interface TraceDetail {
  trace_id: string;
  label: string;
  status: string;
  event_count: number | null;
  created_at: string;
  sealed_at: string | null;
  composite_hash: string | null;
  seal_event_id: string | null;
  metadata?: Record<string, unknown>;
  events: TraceEventSummary[];
  event_page: number;
  event_limit: number;
  event_total: number;
  event_has_more: boolean;
}

export interface DeleteTraceResponse {
  trace_id: string;
  deleted: boolean;
}

export interface SealTraceResponse {
  trace_id: string;
  status: string;
  message: string;
}

export interface TraceProofEvent {
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  content_hash: string;
  timestamp: string;
  signature: string;
  public_key: string;
}

export interface TraceProofSealEvent {
  event_id: string;
  event_type: string;
  content_hash: string;
  timestamp: string;
  signature: string;
  public_key: string;
}

export interface TraceProofVerification {
  composite_hash_valid: boolean;
  all_signatures_valid: boolean;
}

export interface TraceProofBundle {
  version: string;
  trace_id: string;
  label: string;
  tenant_domain: string;
  status: string;
  created_at: string;
  sealed_at: string;
  composite_hash: string;
  event_count: number;
  events: TraceProofEvent[];
  seal_event: TraceProofSealEvent;
  verification: TraceProofVerification;
}

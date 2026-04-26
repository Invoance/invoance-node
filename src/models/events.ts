import type { OrganizationPublic } from "./index.js";

// ── Events ──────────────────────────────────────────────────

export interface IngestEventParams {
  eventType: string;
  payload: Record<string, unknown>;
  eventTime?: string;
  idempotencyKey?: string;
  traceId?: string;
}

export interface IngestEventResponse {
  event_id: string;
  ingested_at: string;
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  eventType?: string;
}

export interface EventListItem {
  event_id: string;
  event_type: string;
  payload_hash: string;
  event_hash: string;
  retention_policy: string;
  ingested_at: string;
  event_time?: string;
  idempotency_key?: string;
}

export interface ListEventsResponse {
  events: EventListItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ComplianceEvent {
  event_id: string;
  tenant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  event_time?: string;
  retention_policy: string;
  access_tier: string;
  api_key_id?: string;
  user_id?: string;
  ingested_at: string;
  payload_hash: string;
  request_hash: string;
  event_hash: string;
  idempotency_key?: string;
  organization?: OrganizationPublic;
}

export interface VerifyEventParams {
  payloadHash?: string;
  payload?: Record<string, unknown>;
}

export interface VerifyEventResponse {
  event_id: string;
  match_result: boolean;
  matched_field?: string;
  anchored_hash: string;
  submitted_hash: string;
  anchored_at: string;
  method: string;
  organization?: OrganizationPublic;
}

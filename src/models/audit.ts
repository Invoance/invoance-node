// ── Audit Logs models ───────────────────────────────────────

export interface AuditActor {
  type?: string;
  id?: string;
  name?: string;
  [k: string]: unknown;
}

export interface AuditTarget {
  type?: string;
  id?: string;
  [k: string]: unknown;
}

export interface IngestAuditEventParams {
  /** Your own id for the org — your external id (e.g. "org_01J8F3KQ2R7VWX9YB4ND6MCZAH") or the aorg_ id. */
  organizationId: string;
  action: string;
  actor: AuditActor;
  occurredAt?: string;
  targets?: AuditTarget[];
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Idempotency header for safe retries (see `contentIdempotencyKey`). */
  idempotencyKey?: string;
}

export interface ListAuditEventsParams {
  organizationId?: string;
  actions?: string;
  actorId?: string;
  targetId?: string;
  /** Inclusive RFC3339 bounds on occurred_at. */
  rangeStart?: string;
  rangeEnd?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditEvent {
  id: string;
  org_id: string;
  seq: number;
  occurred_at: string;
  ingested_at: string;
  action: string;
  actor: AuditActor | null;
  targets: AuditTarget[] | null;
  context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  payload_hash: string;
  signature: string;
  signing_public_key: string;
  [k: string]: unknown;
}

export interface ListAuditEventsResponse {
  events: AuditEvent[];
  next_cursor: string | null;
}

export interface CreateAuditOrgParams {
  /** Your own id for the org. */
  organizationId: string;
  name?: string;
}

export interface CreateAuditStreamParams {
  url: string;
  /** v1 supports `webhook` only. */
  type?: string;
}

export interface CreatePortalSessionParams {
  organizationId: string;
  /** `audit_logs` or `log_streams`. */
  intent: string;
  /** Viewer session length in seconds (default 7200; clamped 60..86400). */
  sessionDurationSeconds?: number;
}

export interface CreateAuditExportParams {
  organizationId: string;
  format: "csv" | "ndjson";
  filters?: Record<string, unknown>;
}

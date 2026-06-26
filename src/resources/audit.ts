/**
 * Audit Logs resource – `client.audit.*`
 *
 * The audit-log product surface: an append-only, per-tenant signed event ledger with
 * end-customer orgs, SIEM/webhook streams, hosted-viewer portal links, and async exports.
 * Methods resolve to the server's JSON. For an offline signature check of a returned
 * event, see `verifyAuditEvent`.
 */

import { createHash } from "node:crypto";

import type { HttpTransport } from "../http.js";
import type {
  AuditEvent,
  CreateAuditExportParams,
  CreateAuditOrgParams,
  CreateAuditStreamParams,
  CreatePortalSessionParams,
  IngestAuditEventParams,
  ListAuditEventsParams,
  ListAuditEventsResponse,
} from "../models/audit.js";

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return (
      "{" +
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stableStringify((v as Record<string, unknown>)[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v) ?? "null";
}

/** Derive a stable Idempotency-Key from an event body (safe-retry helper). */
export function contentIdempotencyKey(body: Record<string, unknown>): string {
  return "idem_" + createHash("sha256").update(stableStringify(body)).digest("hex");
}

class AuditEventsResource {
  constructor(private readonly t: HttpTransport) {}

  /** POST /audit/events – append one signed event. */
  async ingest(params: IngestAuditEventParams): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      organization_id: params.organizationId,
      action: params.action,
      occurred_at: params.occurredAt ?? new Date().toISOString(),
      actor: params.actor,
      targets: params.targets ?? [],
    };
    if (params.context) body.context = params.context;
    if (params.metadata) body.metadata = params.metadata;
    // The ledger requires an Idempotency-Key; derive a content-stable one if absent.
    const idem = params.idempotencyKey ?? contentIdempotencyKey(body);
    return this.t.post("/audit/events", body, idem);
  }

  /** GET /audit/events – keyset-paginated listing. */
  async list(params: ListAuditEventsParams = {}): Promise<ListAuditEventsResponse> {
    return this.t.get<ListAuditEventsResponse>("/audit/events", {
      organization_id: params.organizationId,
      actions: params.actions,
      actor_id: params.actorId,
      target_id: params.targetId,
      range_start: params.rangeStart,
      range_end: params.rangeEnd,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  /** GET /audit/events/:id */
  async get(eventId: string): Promise<AuditEvent> {
    return this.t.get<AuditEvent>(`/audit/events/${eventId}`);
  }

  /** GET /audit/events/:id/verify – server-side verify (pinned key). */
  async verify(eventId: string): Promise<Record<string, unknown>> {
    return this.t.get(`/audit/events/${eventId}/verify`);
  }
}

class AuditOrgsResource {
  constructor(private readonly t: HttpTransport) {}

  async create(params: CreateAuditOrgParams): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { organization_id: params.organizationId };
    if (params.name) body.name = params.name;
    return this.t.post("/audit/orgs", body);
  }

  async list(): Promise<Record<string, unknown>> {
    return this.t.get("/audit/orgs");
  }

  async integrity(organizationId: string): Promise<Record<string, unknown>> {
    return this.t.get(`/audit/orgs/${organizationId}/integrity`);
  }

  async setRetention(organizationId: string, days: number): Promise<Record<string, unknown>> {
    return this.t.put(`/audit/orgs/${organizationId}/retention`, { days });
  }
}

class AuditStreamsResource {
  constructor(private readonly t: HttpTransport) {}

  /** Create a webhook stream; the signing secret is returned ONCE. */
  async create(organizationId: string, params: CreateAuditStreamParams): Promise<Record<string, unknown>> {
    return this.t.post(`/audit/orgs/${organizationId}/streams`, {
      type: params.type ?? "webhook",
      url: params.url,
    });
  }

  async list(organizationId: string): Promise<Record<string, unknown>> {
    return this.t.get(`/audit/orgs/${organizationId}/streams`);
  }

  async delete(organizationId: string, streamId: string): Promise<Record<string, unknown>> {
    return this.t.delete(`/audit/orgs/${organizationId}/streams/${streamId}`);
  }

  async test(organizationId: string, streamId: string): Promise<Record<string, unknown>> {
    return this.t.post(`/audit/orgs/${organizationId}/streams/${streamId}/test`);
  }
}

class AuditPortalSessionsResource {
  constructor(private readonly t: HttpTransport) {}

  /** Mint a one-time hosted-viewer link. */
  async create(params: CreatePortalSessionParams): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { organization_id: params.organizationId, intent: params.intent };
    if (params.sessionDurationSeconds != null) {
      body.session_duration_seconds = params.sessionDurationSeconds;
    }
    return this.t.post("/audit/portal_sessions", body);
  }
}

class AuditExportsResource {
  constructor(private readonly t: HttpTransport) {}

  /** Queue an async CSV/NDJSON export job. */
  async create(params: CreateAuditExportParams): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { organization_id: params.organizationId, format: params.format };
    if (params.filters) body.filters = params.filters;
    return this.t.post("/audit/exports", body);
  }

  /** Poll a job; when `status === "ready"` the response has `download_url`. */
  async get(exportId: string): Promise<Record<string, unknown>> {
    return this.t.get(`/audit/exports/${exportId}`);
  }
}

export class AuditResource {
  readonly events: AuditEventsResource;
  readonly orgs: AuditOrgsResource;
  readonly streams: AuditStreamsResource;
  readonly portalSessions: AuditPortalSessionsResource;
  readonly exports: AuditExportsResource;

  constructor(t: HttpTransport) {
    this.events = new AuditEventsResource(t);
    this.orgs = new AuditOrgsResource(t);
    this.streams = new AuditStreamsResource(t);
    this.portalSessions = new AuditPortalSessionsResource(t);
    this.exports = new AuditExportsResource(t);
  }
}

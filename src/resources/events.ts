/**
 * Events resource – `client.events.*`
 */

import type { HttpTransport } from "../http.js";
import { ValidationError } from "../errors.js";
import { assertSha256Hex } from "../validate.js";
import type {
  IngestEventParams,
  IngestEventResponse,
  ListEventsParams,
  ListEventsResponse,
  ComplianceEvent,
  VerifyEventParams,
  VerifyEventResponse,
} from "../models/events.js";

export class EventsResource {
  constructor(private readonly t: HttpTransport) {}

  /** POST /events – Ingest a compliance event. */
  async ingest(params: IngestEventParams): Promise<IngestEventResponse> {
    const body: Record<string, unknown> = {
      event_type: params.eventType,
      payload: params.payload,
    };
    if (params.eventTime) body.event_time = params.eventTime;
    if (params.traceId) body.trace_id = params.traceId;

    return this.t.post<IngestEventResponse>(
      "/events",
      body,
      params.idempotencyKey,
    );
  }

  /** GET /events – Paginated event listing (max 500, cached 30s). */
  async list(params: ListEventsParams = {}): Promise<ListEventsResponse> {
    return this.t.get<ListEventsResponse>("/events", {
      page: params.page,
      limit: params.limit,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      event_type: params.eventType,
    });
  }

  /** GET /events/:eventId – Retrieve a single event. */
  async get(eventId: string): Promise<ComplianceEvent> {
    return this.t.get<ComplianceEvent>(`/events/${eventId}`);
  }

  /**
   * POST /events/:eventId/verify – Hash verification.
   *
   * Provide **either** `payloadHash` (hex SHA-256) **or** `payload`
   * (raw JSON — the server canonicalizes and hashes for you).
   * Passing neither throws {@link ValidationError}.
   */
  async verify(
    eventId: string,
    params: VerifyEventParams,
  ): Promise<VerifyEventResponse> {
    if (params.payloadHash == null && params.payload == null) {
      throw new ValidationError(
        "events.verify requires either `payloadHash` or `payload`",
      );
    }
    const body: Record<string, unknown> = {};
    if (params.payloadHash != null) {
      assertSha256Hex("payloadHash", params.payloadHash);
      body.payload_hash = params.payloadHash;
    }
    if (params.payload != null) body.payload = params.payload;

    return this.t.post<VerifyEventResponse>(
      `/events/${eventId}/verify`,
      body,
    );
  }
}

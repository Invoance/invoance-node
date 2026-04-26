/**
 * Traces resource – `client.traces.*`
 */

import type { HttpTransport } from "../http.js";
import type {
  CreateTraceParams,
  CreateTraceResponse,
  DeleteTraceResponse,
  GetTraceParams,
  ListTracesParams,
  ListTracesResponse,
  TraceDetail,
  SealTraceResponse,
  TraceProofBundle,
} from "../models/traces.js";

export class TracesResource {
  constructor(private readonly t: HttpTransport) {}

  /** POST /traces – Create a new trace. */
  async create(params: CreateTraceParams): Promise<CreateTraceResponse> {
    const body: Record<string, unknown> = {
      label: params.label,
    };
    if (params.metadata) body.metadata = params.metadata;

    return this.t.post<CreateTraceResponse>("/traces", body);
  }

  /** GET /traces – Paginated trace listing. */
  async list(params: ListTracesParams = {}): Promise<ListTracesResponse> {
    return this.t.get<ListTracesResponse>("/traces", {
      page: params.page,
      limit: params.limit,
      status: params.status,
    });
  }

  /** GET /traces/:traceId – Get trace detail with paginated events. */
  async get(traceId: string, params: GetTraceParams = {}): Promise<TraceDetail> {
    return this.t.get<TraceDetail>(`/traces/${traceId}`, {
      event_page: params.event_page,
      event_limit: params.event_limit,
    });
  }

  /** DELETE /traces/:traceId – Delete an empty open trace. */
  async delete(traceId: string): Promise<DeleteTraceResponse> {
    return this.t.delete<DeleteTraceResponse>(`/traces/${traceId}`);
  }

  /** POST /traces/:traceId/seal – Seal a trace (async, returns 202). */
  async seal(traceId: string): Promise<SealTraceResponse> {
    return this.t.post<SealTraceResponse>(`/traces/${traceId}/seal`, {});
  }

  /** GET /traces/:traceId/proof – Export proof bundle as JSON (sealed traces only). */
  async proof(traceId: string): Promise<TraceProofBundle> {
    return this.t.get<TraceProofBundle>(`/traces/${traceId}/proof`);
  }

  /** GET /traces/:traceId/proof/pdf – Download proof bundle as PDF (sealed traces only). */
  async proofPdf(traceId: string): Promise<ArrayBuffer> {
    return this.t.getBytes(`/traces/${traceId}/proof/pdf`);
  }
}

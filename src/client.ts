/**
 * Top-level SDK client.
 *
 * @example
 * ```ts
 * import { InvoanceClient } from "invoance";
 *
 * // Reads INVOANCE_API_KEY and INVOANCE_BASE_URL from env automatically
 * const client = new InvoanceClient();
 *
 * // Or pass explicitly to override
 * const client = new InvoanceClient({ apiKey: "inv_live_abc123" });
 *
 * const event = await client.events.ingest({
 *   eventType: "user.login",
 *   payload: { userId: "u_42" },
 * });
 * ```
 */

import { type ClientConfig, type ResolvedConfig, resolveConfig } from "./config.js";
import { HttpTransport } from "./http.js";
import { EventsResource } from "./resources/events.js";
import { DocumentsResource } from "./resources/documents.js";
import { AttestationsResource } from "./resources/attestations.js";
import { TracesResource } from "./resources/traces.js";
import {
  AuthenticationError,
  ForbiddenError,
  InvoanceError,
  NetworkError,
  QuotaExceededError,
  TimeoutError,
} from "./errors.js";

/**
 * Outcome of {@link InvoanceClient.validate}.
 *
 * `valid === true` means the API key was accepted by the server
 * (2xx, 403, or 429 — 403 and 429 still prove the key authenticated).
 * `valid === false` means the key was rejected, or the request never
 * reached the server. `reason` is always populated when the result
 * carries useful information for the caller.
 */
export interface ValidationResult {
  valid: boolean;
  reason: string | null;
  baseUrl: string;
}

export class InvoanceClient {
  readonly events: EventsResource;
  readonly documents: DocumentsResource;
  readonly attestations: AttestationsResource;
  readonly traces: TracesResource;

  private readonly transport: HttpTransport;
  private readonly resolvedConfig: ResolvedConfig;

  constructor(config: ClientConfig = {}) {
    const resolved = resolveConfig(config);
    this.resolvedConfig = resolved;
    this.transport = new HttpTransport(resolved);

    this.events = new EventsResource(this.transport);
    this.documents = new DocumentsResource(this.transport);
    this.attestations = new AttestationsResource(this.transport);
    this.traces = new TracesResource(this.transport);
  }

  /**
   * Probe a cheap authenticated endpoint to confirm the API key works.
   *
   * Issues `GET /v1/events?limit=1` and classifies the outcome. Does
   * not throw — every failure mode (bad key, network down, timeout,
   * 5xx) is converted into a {@link ValidationResult} the caller can
   * inspect.
   *
   * ```ts
   * const { valid, reason } = await client.validate();
   * if (!valid) throw new Error(`bad Invoance config: ${reason}`);
   * ```
   */
  async validate(): Promise<ValidationResult> {
    const baseUrl = this.resolvedConfig.baseUrl;
    try {
      await this.events.list({ limit: 1 });
      return { valid: true, reason: null, baseUrl };
    } catch (e) {
      if (e instanceof AuthenticationError) {
        return {
          valid: false,
          reason: "Authentication failed — check INVOANCE_API_KEY",
          baseUrl,
        };
      }
      if (e instanceof ForbiddenError) {
        return {
          valid: true,
          reason: "API key authenticated but lacks permission to list events",
          baseUrl,
        };
      }
      if (e instanceof QuotaExceededError) {
        return {
          valid: true,
          reason: "API key authenticated but currently rate limited",
          baseUrl,
        };
      }
      if (e instanceof NetworkError || e instanceof TimeoutError) {
        return {
          valid: false,
          reason: `Server unreachable: ${e.message}`,
          baseUrl,
        };
      }
      if (e instanceof InvoanceError) {
        return { valid: false, reason: e.message, baseUrl };
      }
      throw e;
    }
  }
}

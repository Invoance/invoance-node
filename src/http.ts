/**
 * Low-level HTTP transport using Node 18+ native `fetch`.
 * Zero external dependencies.
 *
 * @internal
 */

import type { ResolvedConfig } from "./config.js";
import { SDK_VERSION } from "./version.js";
import {
  NetworkError,
  TimeoutError,
  throwForStatus,
  type RequestContext,
} from "./errors.js";

export class HttpTransport {
  private readonly cfg: ResolvedConfig;
  private readonly headers: Record<string, string>;

  constructor(cfg: ResolvedConfig) {
    this.cfg = cfg;
    this.headers = {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `invoance-node/${SDK_VERSION}`,
      ...cfg.extraHeaders,
    };
  }

  // ── Public ────────────────────────────────────────────────

  async get<T = Record<string, unknown>>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const resp = await this.doFetch(url, { method: "GET", headers: this.headers }, {
      method: "GET",
      path,
    });
    return this.handle<T>(resp, { method: "GET", path });
  }

  async post<T = Record<string, unknown>>(
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = { ...this.headers };
    const idem = idempotencyKey ?? this.cfg.idempotencyKey;
    if (idem) headers["Idempotency-Key"] = idem;

    const resp = await this.doFetch(
      url,
      {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
      { method: "POST", path },
    );
    return this.handle<T>(resp, { method: "POST", path });
  }

  async delete<T = Record<string, unknown>>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    const resp = await this.doFetch(
      url,
      { method: "DELETE", headers: this.headers },
      { method: "DELETE", path },
    );
    return this.handle<T>(resp, { method: "DELETE", path });
  }

  /** GET that returns raw bytes (ArrayBuffer) instead of JSON. */
  async getBytes(path: string): Promise<ArrayBuffer> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      ...this.headers,
      Accept: "application/octet-stream",
    };
    delete headers["Content-Type"];

    const request: RequestContext = { method: "GET", path };
    const resp = await this.doFetch(url, { method: "GET", headers }, request);

    if (!resp.ok) {
      let body: Record<string, unknown> | null = null;
      try {
        body = (await resp.json()) as Record<string, unknown>;
      } catch {
        // non-json error
      }
      throwForStatus(resp.status, body, {
        request,
        retryAfterSeconds: parseRetryAfter(resp.headers.get("retry-after")),
      });
    }

    return resp.arrayBuffer();
  }

  /** GET that returns the raw JSON value (not typed). */
  async getRaw(path: string): Promise<unknown> {
    const url = this.buildUrl(path);
    const resp = await this.doFetch(
      url,
      { method: "GET", headers: this.headers },
      { method: "GET", path },
    );
    return this.handle(resp, { method: "GET", path });
  }

  // ── Internals ─────────────────────────────────────────────

  private buildUrl(
    path: string,
    params?: Record<string, unknown>,
  ): string {
    const base = `${this.cfg.baseUrl}/${this.cfg.apiVersion}${path}`;
    if (!params) return base;

    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null) qs.set(k, String(v));
    }
    const str = qs.toString();
    return str ? `${base}?${str}` : base;
  }

  /**
   * Wrap `fetch` so network-level failures (DNS, connection, TLS, timeout)
   * are raised as InvoanceError subclasses instead of raw AbortError /
   * TypeError. This keeps `catch (e) { if (e instanceof InvoanceError) ... }`
   * exhaustive for transport-layer failures.
   */
  private async doFetch(
    url: string,
    init: RequestInit,
    request: RequestContext,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
    } catch (err) {
      const isTimeout =
        err instanceof DOMException && err.name === "TimeoutError" ||
        (err instanceof Error && err.name === "TimeoutError") ||
        (err instanceof Error && err.name === "AbortError");

      if (isTimeout) {
        throw new TimeoutError(
          `Request timed out after ${this.cfg.timeoutMs}ms on ${request.method} ${request.path}`,
          { request, cause: err },
        );
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new NetworkError(
        `Network failure on ${request.method} ${request.path}: ${reason}`,
        { request, cause: err },
      );
    }
  }

  private async handle<T>(resp: Response, request: RequestContext): Promise<T> {
    let body: Record<string, unknown> | null = null;
    try {
      body = (await resp.json()) as Record<string, unknown>;
    } catch {
      // empty or non-json
    }
    throwForStatus(resp.status, body, {
      request,
      retryAfterSeconds: parseRetryAfter(resp.headers.get("retry-after")),
    });
    return body as T;
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  // HTTP-date form — convert to delta seconds
  const ts = Date.parse(value);
  if (!Number.isNaN(ts)) {
    const delta = Math.max(0, (ts - Date.now()) / 1000);
    return delta;
  }
  return undefined;
}

/**
 * SDK configuration.
 *
 * All fields are optional — when omitted the SDK reads from
 * environment variables:
 *
 * - `INVOANCE_API_KEY`  — API key (required)
 * - `INVOANCE_BASE_URL` — API host (defaults to `https://api.invoance.com`)
 */

const DEFAULT_BASE_URL = "https://api.invoance.com";
const DEFAULT_TIMEOUT_MS = 30_000;

const ENV_API_KEY = "INVOANCE_API_KEY";
const ENV_BASE_URL = "INVOANCE_BASE_URL";

export interface ClientConfig {
  /**
   * Your Invoance API key (`inv_live_...` or `inv_test_...`).
   * Falls back to `INVOANCE_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
   * Override the API host. Falls back to `INVOANCE_BASE_URL` env var,
   * then `https://api.invoance.com`.
   */
  baseUrl?: string;

  /**
   * API version prefix (default `"v1"`).
   *
   * This is prepended to every request path — e.g. when set to `"v1"`,
   * a resource path `/events` becomes `/v1/events`.
   *
   * Set to `"v2"` (or later) when the backend ships a new API version.
   */
  apiVersion?: string;

  /** HTTP request timeout in ms (default 30 000). */
  timeoutMs?: number;

  /** Default idempotency key sent with every mutating request. */
  idempotencyKey?: string;

  /** Additional headers merged into every request. */
  extraHeaders?: Record<string, string>;
}

/** @internal */
export function resolveConfig(cfg: ClientConfig = {}) {
  const apiKey = cfg.apiKey || process.env[ENV_API_KEY] || "";
  if (!apiKey) {
    throw new Error(
      `apiKey is required. Pass it explicitly or set the ${ENV_API_KEY} environment variable.`,
    );
  }

  const baseUrl = (
    cfg.baseUrl || process.env[ENV_BASE_URL] || DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  const apiVersion = (cfg.apiVersion ?? "v1").replace(/^\/+|\/+$/g, "");

  return {
    apiKey,
    baseUrl,
    apiVersion,
    timeoutMs: cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    idempotencyKey: cfg.idempotencyKey,
    extraHeaders: cfg.extraHeaders ?? {},
  };
}

export type ResolvedConfig = ReturnType<typeof resolveConfig>;

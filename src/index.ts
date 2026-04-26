/**
 * Invoance – Official TypeScript SDK for the Invoance compliance API.
 *
 * @example
 * ```ts
 * import { InvoanceClient } from "invoance";
 *
 * const client = new InvoanceClient({ apiKey: "inv_live_abc123" });
 *
 * const event = await client.events.ingest({
 *   eventType: "user.login",
 *   payload: { userId: "u_42" },
 * });
 * ```
 *
 * @module
 */

export { InvoanceClient } from "./client.js";
export type { ValidationResult } from "./client.js";
export type { ClientConfig } from "./config.js";
export {
  InvoanceError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  QuotaExceededError,
  ServerError,
  NetworkError,
  TimeoutError,
} from "./errors.js";
export type { RequestContext } from "./errors.js";
export type * from "./models/index.js";

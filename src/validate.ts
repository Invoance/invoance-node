/**
 * Shared client-side input validators.
 *
 * @internal
 */

import { ValidationError } from "./errors.js";

const HEX_SHA256 = /^[0-9a-f]{64}$/;

/**
 * Validate that a string is a 64-character lowercase hex SHA-256 digest.
 * Throws {@link ValidationError} with a helpful message when it isn't.
 */
export function assertSha256Hex(fieldName: string, value: unknown): void {
  if (typeof value !== "string") {
    throw new ValidationError(
      `${fieldName} must be a string containing a 64-char hex SHA-256 digest (got ${typeof value})`,
    );
  }
  if (value.length !== 64) {
    throw new ValidationError(
      `${fieldName} must be 64 hex chars (got ${value.length} chars)`,
    );
  }
  if (!HEX_SHA256.test(value)) {
    throw new ValidationError(
      `${fieldName} must be lowercase hex [0-9a-f]; "${value.slice(0, 16)}…" is not`,
    );
  }
}

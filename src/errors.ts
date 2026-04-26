/**
 * SDK error hierarchy.
 *
 * Every error raised by the SDK — API responses, network failures, and
 * client-side validation — inherits from {@link InvoanceError}, so a
 * single `catch (e) { if (e instanceof InvoanceError) ... }` is enough
 * to catch anything the SDK throws.
 *
 * ```ts
 * try {
 *   await client.events.ingest({ ... });
 * } catch (e) {
 *   if (e instanceof QuotaExceededError) {
 *     console.log("Upgrade your plan");
 *   } else if (e instanceof TimeoutError) {
 *     console.log("Request timed out — retrying");
 *   } else if (e instanceof InvoanceError) {
 *     console.log(`Invoance error: ${e.message}`);
 *   }
 * }
 * ```
 */

export interface RequestContext {
  method: string;
  path: string;
}

export class InvoanceError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly body?: Record<string, unknown>;
  readonly request?: RequestContext;
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    opts?: {
      statusCode?: number;
      errorCode?: string;
      body?: Record<string, unknown>;
      request?: RequestContext;
      retryAfterSeconds?: number;
      cause?: unknown;
    },
  ) {
    super(message, opts?.cause != null ? { cause: opts.cause } : undefined);
    this.name = "InvoanceError";
    this.statusCode = opts?.statusCode;
    this.errorCode = opts?.errorCode;
    this.body = opts?.body;
    this.request = opts?.request;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
  }
}

export class AuthenticationError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "ValidationError";
  }
}

export class ConflictError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "ConflictError";
  }
}

export class QuotaExceededError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "QuotaExceededError";
  }
}

export class ServerError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "ServerError";
  }
}

/**
 * Raised when the request fails before a response is received —
 * DNS failure, connection refused, TLS handshake error, etc.
 */
export class NetworkError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "NetworkError";
  }
}

/**
 * Raised when the request exceeds the configured `timeoutMs`.
 */
export class TimeoutError extends InvoanceError {
  constructor(m: string, o?: ConstructorParameters<typeof InvoanceError>[1]) {
    super(m, o);
    this.name = "TimeoutError";
  }
}

const STATUS_MAP: Record<number, typeof InvoanceError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: ForbiddenError,
  404: NotFoundError,
  409: ConflictError,
  429: QuotaExceededError,
};

function describeRequest(ctx?: RequestContext): string {
  return ctx ? ` on ${ctx.method} ${ctx.path}` : "";
}

/** @internal */
export function throwForStatus(
  statusCode: number,
  body: Record<string, unknown> | null,
  opts?: {
    request?: RequestContext;
    retryAfterSeconds?: number;
  },
): void {
  if (statusCode >= 200 && statusCode < 300) return;

  const b = body ?? {};
  const errorCode = (b.error as string) ?? "unknown";
  const serverMessage = b.message as string | undefined;

  let message: string;
  if (serverMessage) {
    message = serverMessage;
  } else if (statusCode === 429 && opts?.retryAfterSeconds != null) {
    message = `HTTP 429${describeRequest(opts.request)} — rate limited, retry after ${opts.retryAfterSeconds}s`;
  } else {
    message = `HTTP ${statusCode}${describeRequest(opts?.request)} (no response body)`;
  }

  const Cls =
    STATUS_MAP[statusCode] ?? (statusCode >= 500 ? ServerError : InvoanceError);

  throw new Cls(message, {
    statusCode,
    errorCode,
    body: b,
    request: opts?.request,
    retryAfterSeconds: opts?.retryAfterSeconds,
  });
}

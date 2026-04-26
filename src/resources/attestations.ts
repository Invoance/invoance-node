/**
 * AI Attestations resource – `client.attestations.*`
 */

import { createHash, verify as cryptoVerify } from "node:crypto";
import type { HttpTransport } from "../http.js";
import { assertSha256Hex } from "../validate.js";
import type {
  IngestAttestationParams,
  IngestAttestationResponse,
  ListAttestationsParams,
  ListAttestationsResponse,
  AiAttestation,
  VerifyAttestationParams,
  VerifyAttestationResponse,
  SignatureVerificationResult,
} from "../models/attestations.js";

export class AttestationsResource {
  constructor(private readonly t: HttpTransport) {}

  /** POST /ai/attestations – Anchor an AI attestation. */
  async ingest(
    params: IngestAttestationParams,
  ): Promise<IngestAttestationResponse> {
    const body: Record<string, unknown> = {
      type: params.type,
      payload: {
        input: params.input,
        output: params.output,
      },
      context: {
        model_provider: params.modelProvider,
        model_name: params.modelName,
        model_version: params.modelVersion,
      },
    };

    if (params.subject != null) {
      const { userId, sessionId, ...extra } = params.subject;
      const subject: Record<string, unknown> = {};
      if (userId != null) subject.user_id = userId;
      if (sessionId != null) subject.session_id = sessionId;
      Object.assign(subject, extra);
      if (Object.keys(subject).length > 0) body.subject = subject;
    }

    if (params.traceId != null) body.trace_id = params.traceId;

    return this.t.post<IngestAttestationResponse>(
      "/ai/attestations",
      body,
      params.idempotencyKey,
    );
  }

  /** GET /ai/attestations – Paginated attestation listing. */
  async list(
    params: ListAttestationsParams = {},
  ): Promise<ListAttestationsResponse> {
    return this.t.get<ListAttestationsResponse>("/ai/attestations", {
      page: params.page,
      limit: params.limit,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      attestation_type: params.attestationType,
      model_provider: params.modelProvider,
    });
  }

  /** GET /ai/attestations/:id – Retrieve a single attestation. */
  async get(attestationId: string): Promise<AiAttestation> {
    return this.t.get<AiAttestation>(
      `/ai/attestations/${attestationId}`,
    );
  }

  /** POST /ai/attestations/:id/verify – Hash verification. */
  async verify(
    attestationId: string,
    params: VerifyAttestationParams,
  ): Promise<VerifyAttestationResponse> {
    assertSha256Hex("contentHash", params.contentHash);
    return this.t.post<VerifyAttestationResponse>(
      `/ai/attestations/${attestationId}/verify`,
      { content_hash: params.contentHash },
    );
  }

  /**
   * GET /ai/attestations/:id/raw – Retrieve the original canonical
   * JSON payload from R2. Cached server-side for 5 minutes.
   */
  async getRaw(
    attestationId: string,
  ): Promise<Record<string, unknown>> {
    return this.t.getRaw(
      `/ai/attestations/${attestationId}/raw`,
    ) as Promise<Record<string, unknown>>;
  }

  /**
   * Verify by raw payload — hashes client-side, then calls verify.
   *
   * Accepts the canonical JSON stored in Invoance (the "Raw immutable
   * record") as a string, Buffer, or object.
   *
   * When an object is passed the keys **must** be in the same order as
   * the Rust struct (`type`, `payload`, `context`, `subject`) because
   * the backend hashes using `serde_json` which preserves struct field
   * order — *not* alphabetical order.
   *
   * The safest approach is to pass the raw JSON string exactly as shown
   * in the dashboard's "Raw immutable record" viewer.
   */
  async verifyPayload(
    attestationId: string,
    payload: Record<string, unknown> | string | Buffer,
  ): Promise<VerifyAttestationResponse> {
    let canonical: string;

    if (Buffer.isBuffer(payload)) {
      payload = payload.toString("utf-8");
    }

    if (typeof payload === "string") {
      // Re-parse to compact form (strips pretty-print whitespace).
      // JSON.parse preserves key order from the source string.
      canonical = JSON.stringify(JSON.parse(payload));
    } else {
      canonical = JSON.stringify(payload);
    }

    const contentHash = createHash("sha256")
      .update(canonical, "utf-8")
      .digest("hex");

    return this.verify(attestationId, { contentHash });
  }

  /**
   * Verify the Ed25519 signature of an attestation — fully client-side.
   *
   * Fetches the attestation, then verifies the cryptographic signature
   * against the `signed_payload` using the `public_key`. This proves
   * that **no field has been tampered with** since ingestion — including
   * the timestamp, hashes, and metadata.
   *
   * No trust in the server is required: the verification happens
   * entirely in the SDK using Node's built-in `crypto` module.
   */
  async verifySignature(
    attestationId: string,
  ): Promise<SignatureVerificationResult> {
    const att = await this.get(attestationId);

    const signedPayloadBytes = Buffer.from(att.signed_payload, "hex");
    const signatureBytes = Buffer.from(att.signature, "hex");
    const publicKeyBytes = Buffer.from(att.public_key, "hex");

    let valid: boolean;
    let reason: string | null = null;

    try {
      valid = cryptoVerify(
        null, // Ed25519 doesn't use a separate hash algorithm
        signedPayloadBytes,
        {
          key: Buffer.concat([
            // Ed25519 DER public key prefix (RFC 8410)
            Buffer.from("302a300506032b6570032100", "hex"),
            publicKeyBytes,
          ]),
          format: "der",
          type: "spki",
        },
        signatureBytes,
      );
      if (!valid) {
        reason =
          "Signature does not match signed_payload + public_key";
      }
    } catch (err) {
      valid = false;
      reason = err instanceof Error ? err.message : String(err);
    }

    // Parse the signed payload to show what was covered
    let signedData: Record<string, unknown> | null = null;
    try {
      signedData = JSON.parse(signedPayloadBytes.toString("utf-8"));
    } catch {
      // not valid JSON
    }

    return { valid, reason, attestation: att, signedData };
  }
}

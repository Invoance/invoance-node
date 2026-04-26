import type { OrganizationPublic } from "./index.js";

// ── AI Attestations ─────────────────────────────────────────

/**
 * Subject context for an attestation.
 *
 * `userId` and `sessionId` are well-known fields; any additional
 * properties are accepted as custom tenant-specific context
 * (e.g. `department`, `requestId`, `traceId`).
 *
 * All fields become part of the attestation hash.
 */
export interface AttestationSubject {
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface IngestAttestationParams {
  type: string;
  input: string;
  output: string;
  modelProvider: string;
  modelName: string;
  modelVersion: string;
  /** Subject context — who/what triggered the attestation. */
  subject?: AttestationSubject;
  idempotencyKey?: string;
  /** Optional trace ID to associate this attestation with a trace. */
  traceId?: string;
}

export interface IngestAttestationResponse {
  attestation_id: string;
  created_at: string;
  input_hash: string;
  output_hash: string;
  payload_hash: string;
  status: string;
}

export interface ListAttestationsParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  attestationType?: string;
  modelProvider?: string;
}

export interface AttestationListItem {
  attestation_id: string;
  attestation_type: string;
  attestation_hash: string;
  model_provider?: string;
  model_name?: string;
  retention_policy: string;
  created_at: string;
}

export interface ListAttestationsResponse {
  attestations: AttestationListItem[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface AiAttestation {
  attestation_id: string;
  tenant_id: string;
  attestation_type: string;
  attestation_hash: string;
  input_hash?: string;
  output_hash?: string;
  signed_payload: string;
  signature: string;
  public_key: string;
  signature_alg: string;
  model_provider?: string;
  model_name?: string;
  model_version?: string;
  retention_policy: string;
  created_at: string;
  organization?: OrganizationPublic;
}

/** Result of client-side Ed25519 signature verification. */
export interface SignatureVerificationResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Human-readable reason if invalid, `null` if valid. */
  reason: string | null;
  /** The attestation that was verified. */
  attestation: AiAttestation;
  /** The parsed JSON that was covered by the signature. */
  signedData: Record<string, unknown> | null;
}

export interface VerifyAttestationParams {
  contentHash: string;
}

export interface VerifyAttestationResponse {
  attestation_id: string;
  match_result: boolean;
  matched_field?: string;
  anchored_hash: string;
  submitted_hash: string;
  anchored_at: string;
  organization?: OrganizationPublic;
}

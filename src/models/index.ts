// ── Shared ──────────────────────────────────────────────────

export interface OrganizationPublic {
  name: string;
  issuer_name: string;
  primary_domain: string;
  domain_verified: boolean;
  domain_verified_at?: string;
  logo_url?: string;
}

/** Response of `GET /v1/me` — see {@link InvoanceClient.me}. */
export interface MeResponse {
  valid: boolean;
  organization: {
    id: string;
    name: string;
    issuer_name: string;
    primary_domain: string;
    domain_verified: boolean;
    plan_tier: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  api_key: {
    id: string;
    name?: string;
    key_prefix: string;
    key_last4: string;
    scopes: string[];
    created_at: string;
    last_used_at?: string;
  };
  limits: {
    rate_limit_per_sec: number;
  };
}

export type * from "./events.js";
export type * from "./documents.js";
export type * from "./attestations.js";
export type * from "./traces.js";
export type * from "./audit.js";

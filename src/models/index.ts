// ── Shared ──────────────────────────────────────────────────

export interface OrganizationPublic {
  name: string;
  issuer_name: string;
  primary_domain: string;
  domain_verified: boolean;
  domain_verified_at?: string;
  logo_url?: string;
}

export type * from "./events.js";
export type * from "./documents.js";
export type * from "./attestations.js";
export type * from "./traces.js";

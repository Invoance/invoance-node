# Changelog

All notable changes to the Invoance Node/TypeScript SDK are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the SDK is pre-1.0, breaking changes are only introduced in MINOR releases
(0.x → 0.x+1) and always documented here. Once 1.0.0 ships, the standard SemVer
contract applies.

---

## [0.3.1] - 2026-06-26

### Added

- `audit.portalSessions.create({ linkDurationSeconds })`: the one-time link open window
  in seconds (default 300, range 60..3600), alongside `sessionDurationSeconds`. Maps to
  the new `link_duration_seconds` on `POST /v1/audit/portal_sessions`.

---

## [0.3.0] - 2026-06-26

### Changed

- **Audit org parameter unified to `organizationId`.** Every `client.audit.*`
  method now takes `organizationId` for the org (your own id such as `"org_01J8F3KQ2R7VWX9YB4ND6MCZAH"`,
  or the `aorg_` id). This replaces the inconsistent `org` (ingest), `orgId`
  (list, portalSessions, exports, and the orgs/streams methods), and `externalId`
  (`orgs.create`). The API resolves either the external id or the `aorg_` id.
- **Event filters renamed to `rangeStart` / `rangeEnd`** on `events.list()`
  (previously `occurredAfter` / `occurredBefore`).

Breaking: this renames typed params. Update call sites, for example
`ingest({ org })` becomes `ingest({ organizationId })`. Per this SDK's pre-1.0
policy, breaking changes ship in a minor release.

---

## [0.2.0] - 2026-06-26

### Added

- **Audit Logs** — `client.audit.*`: `events.{ingest,list,get,verify}`, `orgs`,
  `streams`, `portalSessions`, `exports` (typed params, camelCase).
- **`verifyAuditEvent()`** — offline Ed25519 verification of an audit event using Node's
  built-in `crypto` (no new dependency), reconstructing the frozen `invoance.audit/1`
  canonical bytes. Pin the tenant's key via `{ publicKey }`. Conformance is gated by the
  shared golden vectors; one int64-beyond-2^53 vector is out of scope because JSON
  numbers are JS doubles.
- **`contentIdempotencyKey()`** — derive a stable `Idempotency-Key` from an event body.

---

## [0.1.5] — 2026-04-26

### Changed

- CI/CD: switched npm publish auth from API token to Trusted Publishing
  (OIDC). No more npm tokens to maintain or rotate. Verified against
  pypi-style publisher trust at
  https://www.npmjs.com/package/invoance/access.

---

## [0.1.4] — 2026-04-26

### Removed

- All references to the local-dev base URL (`http://localhost:33100`) from
  the README and `.env.example`. The SDK is for SaaS users; local URLs
  were dev-time artifacts that confused new users browsing the npm page.
  `INVOANCE_BASE_URL` still works as an override but is no longer
  documented as a normal use case.

---

## [0.1.2] — 2026-04-26

### Changed

- Repository moved to `github.com/Invoance/invoance-node` (was previously
  in a monorepo). All URLs in package metadata, CHANGELOG, and CI
  workflows updated to point at the new standalone repo. No code
  changes — pure metadata refresh.

---

## [0.1.1] — 2026-04-26

### Changed

- README: clarified that `INVOANCE_BASE_URL` is optional and defaults to
  the production API. The local-dev URL is now shown as an explicit
  override rather than the lead example, so users installing from npm
  see the simple production setup first. No code changes — README only.

---

## [0.1.0] — 2026-04-26

Initial public release.

### Added

- **Events** — `client.events.ingest()`, `get()`, `list()`, `verify()` for
  signing-and-anchoring arbitrary compliance events with hex-SHA-256 payload
  hashes.
- **Documents** — `client.documents.anchor()` (hash-only) and `anchorFile()`
  (hashes + uploads in one call), plus `get()`, `list()`, `verify()`, and
  `getDocumentOriginal()` for retrieving stored payloads.
- **AI attestations** — `client.attestations.ingest()`, `get()`, `list()`,
  `verify()`, `verifySignature()` for cryptographically attesting model
  inputs/outputs/decisions.
- **Traces** — full lifecycle: `create()`, `addEvent()`, `seal()`,
  `getProof()`, `exportProofPdf()` for grouping items into sealed bundles
  with composite hashes.
- **`client.validate()`** — fast credential probe that never throws; returns
  `{ valid, reason, baseUrl }`. Use in health checks and CI guards.
- **Typed error hierarchy** — `InvoanceError` base with `AuthenticationError`,
  `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError`,
  `QuotaExceededError`, `ServerError`, `NetworkError`, `TimeoutError`. Every
  thrown error inherits from `InvoanceError` so consumers can catch the base
  type.
- **Client-side validation** — `documentHash`, `payloadHash`, `contentHash`
  must be valid 64-char hex SHA-256 before a request leaves the client.
- **Env-var configuration** — `INVOANCE_API_KEY` (required) and
  `INVOANCE_BASE_URL` (default: `https://api.invoance.com`) auto-loaded by
  `new InvoanceClient()`. Explicit constructor args override.
- **Examples** — full working scripts under `examples/` for events,
  documents, attestations, and the full trace workflow.
- TypeScript types bundled (no separate `@types/invoance` needed).

### Notes

- Requires Node 18+ (uses native `fetch` and `crypto.subtle`).
- Zero runtime dependencies — only devDependencies for build/test.

[Unreleased]: https://github.com/Invoance/invoance-node/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/Invoance/invoance-node/releases/tag/v0.1.3
[0.1.2]: https://github.com/Invoance/invoance-node/releases/tag/v0.1.2
[0.1.1]: https://github.com/Invoance/invoance-node/releases/tag/v0.1.1
[0.1.0]: https://github.com/Invoance/invoance-node/releases/tag/v0.1.0

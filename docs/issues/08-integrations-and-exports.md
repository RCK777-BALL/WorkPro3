# Integrations, Webhooks, and Exports

## Summary
Provide API keys with scopes, webhook delivery with retries, and CSV/XLSX exports for core objects to match enterprise CMMS expectations.

## User Stories
- As an integration engineer, I can create scoped API keys with rate limits.
- As a partner system, I receive signed webhook callbacks with retries on failure.
- As a data analyst, I can export filtered datasets for Work Orders, assets, and parts.

## Acceptance Criteria
- **API keys:** Model + UI to create/rotate/revoke API keys with scope definitions (read/write per module) and optional IP allowlist; enforce rate limiting per key.
- **Webhooks:** Register webhook endpoints per tenant with topics (work orders, work requests, parts, POs, downtime, notifications); HMAC-signed payloads, exponential backoff retries, dead-letter queue, and replay endpoint.
- **Exports:** CSV/XLSX export endpoints for WOs/assets/parts with filter parity to list endpoints; UI buttons to download; handle long-running exports via background job + notification.
- **Observability:** Delivery logs for webhooks (status, latency, retries) and export job status; admin UI to view.
- **Seed data:** Sample API key, webhook subscription, and export job records for demo.
- **Docs:** Security guidance, signature verification steps, rate-limit defaults, and “How to test” covering key creation, webhook verification, and export download.

## Non-Goals
- OAuth2/OIDC provider capabilities.

## Dependencies
- Existing auth middleware for API calls; notification system for export completion; background job runner.

## Testing/Validation
- Unit tests for HMAC signature generation/verification and rate limiting; integration tests for webhook retry/backoff and export filters.
- UI tests for API key management and webhook subscription screens.
- E2E: create API key → trigger webhook via WO update → verify signature + retry on 500; request export → receive download link when ready.

# Security Quickcheck (Targeted)

## AuthN/AuthZ
- JWT auth middleware exists and is applied to protected routes.
- Role/scope middleware present (`requireRole`, `requireScopes`).
- Tenant/site scoping middleware present for multi-tenant route protection.

## Config hard requirements
- backend validates env at startup (`validateEnv`) and expects JWT + Mongo + CORS settings.
- Missing/invalid env causes startup stop (good fail-fast behavior).

## HTTP protections
- `helmet` enabled.
- `express-rate-limit` configured (general + mobile + burst profiles).
- CORS origin allowlist with normalization and credentials enabled.

## Input validation
- Route-level validators and shared validators exist (`zod`/custom validators by module).

## Gaps found in quick audit
- Large number of failing tests reduces confidence in auth/authorization regressions.
- Some login/auth paths return 500 under DB outage instead of controlled service-unavailable responses.
- Duplicate index warning indicates schema hygiene issue.

## OWASP-aligned quick checklist status
- Authentication controls: partial pass
- Authorization controls: partial pass (route guard structure exists)
- Input validation: partial pass
- Secure headers/rate limiting: pass
- Error handling/resilience: needs improvement under dependency outages

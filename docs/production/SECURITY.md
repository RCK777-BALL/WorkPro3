# Security Controls (ASVS-aligned, high-level)

- V1 Architecture: centralized env validation and fail-fast startup checks.
- V2 Authentication: JWT secret quality check; production-only enforcement.
- V4 Access Control: authenticated `/api` route guard and tenant scoping middleware.
- V5 Validation/Sanitization: route-level validators + mongo sanitization middleware.
- V7 Error handling/logging: structured logs and non-leaky production error messages.
- V14 Config: CORS allowlist, no wildcard in production, no committed secrets.

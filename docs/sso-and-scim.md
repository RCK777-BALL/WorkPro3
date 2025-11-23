# SSO and SCIM integration points

## Identity provider storage

* Per-tenant identity provider settings are stored in the `IdentityProvider` collection.
* Records capture the `protocol` (`oidc` or `saml`), `issuer`, optional metadata URLs, ACS/redirect URLs, and signing certificates (`certificates`).
* A provider entry is considered active when `enabled: true`.

## OIDC

* Enable/disable: `ENABLE_OIDC_SSO` (default: `true`).
* Metadata endpoint: `GET /api/sso/:tenantId/oidc/metadata?provider=<slug>`
  * Returns issuer, authorization/token endpoints, JWKS URI placeholder, and stored certificates.
  * Responds with 404 when the feature flag is disabled or no provider exists for the tenant.
* Auth routes reuse existing passport strategies (`okta`, `azure`).
  * Additional providers backed by `IdentityProvider` are accepted but return a 202 placeholder until a strategy is wired.

## SAML

* Enable/disable: `ENABLE_SAML_SSO` (default: `false`).
* Metadata endpoint: `GET /api/sso/:tenantId/saml/metadata?provider=<slug>`
  * Generates minimal SP metadata using stored ACS URL and first certificate.
* ACS placeholder: `POST /api/sso/:tenantId/saml/acs`
  * Accepts `SAMLResponse`/`RelayState` payloads and responds with a 202 placeholder.
* Redirect placeholder: `GET /api/sso/:tenantId/saml/redirect`.

## SCIM v2 stubs

* Enable/disable: `ENABLE_SCIM_API` (default: `false`).
* Authentication: `Authorization: Bearer <SCIM_BEARER_TOKEN>` header is required along with `X-Tenant-Id` to scope requests.
* Users endpoint
  * `GET /api/scim/v2/Users` returns an empty SCIM list response.
  * `POST /api/scim/v2/Users` validates minimal SCIM user payloads and echoes a placeholder user with metadata.
* Groups endpoint
  * `GET /api/scim/v2/Groups` returns an empty list.
  * `POST /api/scim/v2/Groups` validates payloads and returns a stub group document.

# Security & Integrations

## API keys

API keys are used for server-to-server integrations such as webhook dispatch triggers and export automation. Keys are stored hashed and can be revoked at any time.

**Default headers**

- `X-API-Key: <token>` (preferred)
- `Authorization: ApiKey <token>` (alternate)

**Rate limits**

API key requests are rate limited by default. The per-key limit can be configured when a key is created. The global defaults can be tuned via:

- `API_KEY_RATE_LIMIT_WINDOW_MS`
- `API_KEY_RATE_LIMIT_MAX`

## Webhooks

Webhook subscriptions include a signing secret and retry policy.

**Signing**

Every webhook delivery includes:

- `X-Webhook-Timestamp`: ISO timestamp.
- `X-Webhook-Signature`: `HMAC_SHA256(secret, "<timestamp>.<payload>")`.

**Retries**

Webhook deliveries retry on non-2xx responses using exponential backoff. Delivery attempts and failures are recorded in `WebhookDeliveryLog`.

## Export jobs

Export jobs are queued and processed asynchronously. Supported formats:

- CSV
- XLSX

Jobs progress through `queued → processing → completed/failed`. Completed exports can be downloaded via the exports API.

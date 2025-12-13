# ERP Integrations

This guide explains how to connect WorkPro to external ERP systems. The webhook endpoint accepts work order events so that SAP or other platforms can trigger actions in WorkPro.

## Public API and Developer Portal

- **Versioned OpenAPI**: Publish semantic-versioned OpenAPI documents for both public and admin scopes, with changelog entries and example payload fixtures stored in `docs/api`.
- **Developer Portal Samples**: Provide language-specific snippets (REST/SDK) and environment switchers so integrators can try sandbox vs. production without rewriting calls.
- **Contract Safety**: Use CI checks to assert generated OpenAPI schemas match implemented handlers before releases.

## Webhooks

- **Events**: Deliver signed webhook payloads for work orders (created/updated), asset updates, and inventory adjustments.
- **Operations**: Subscription CRUD with secret rotation, HMAC headers, retry/backoff, and replay of failures from a delivery log.
- **Consumer Guidance**: Document signature verification samples and recommended response patterns (2xx/4xx/5xx) for robust integrations.

## CSV/SFTP Pipelines and Automation

- **Imports/Exports**: Scheduled CSV jobs with column mappings for assets, work orders, and inventory, plus dry-run validation before applying changes.
- **SFTP Support**: Encrypted credential storage, rotation, and health checks for remote file targets.
- **Automation Connectors**: Ship starter Zapier and Power Automate templates to trigger flows (e.g., create WO, sync inventory counts) using the public API and webhook events.

## 1. Obtain Credentials

Generate an API key or OAuth2 token in WorkPro and store it securely in your ERP system. The API key is sent using the `x-api-key` header. OAuth2 tokens are provided via the `Authorization: Bearer <token>` header.

## 2. Configure SAP Outbound Call

1. In SAP, create an HTTP destination pointing to your WorkPro server.
2. Set the URL to `https://<workpro-host>/api/webhooks/workorder`.
3. Choose `POST` as the method and send JSON payloads with event data.
4. Include the API key or OAuth2 token in the request headers.

Example payload:

```json
{
  "event": "create",
  "title": "Pump maintenance",
  "description": "Generated from SAP"
}
```

## 3. Test the Integration

Use a tool like cURL to send a test request:

```bash
curl -X POST https://<workpro-host>/api/webhooks/workorder \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event":"create","title":"Example"}'
```

A successful response returns `{"status":"received"}`.


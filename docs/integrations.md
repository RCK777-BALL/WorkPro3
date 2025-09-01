# ERP Integrations

This guide explains how to connect WorkPro to external ERP systems. The webhook endpoint accepts work order events so that SAP or other platforms can trigger actions in WorkPro.

## 1. Obtain Credentials

Generate an API key or OAuth2 token in WorkPro and store it securely in your ERP system. The API key is sent using the `x-api-key` header. OAuth2 tokens are provided via the `Authorization: Bearer <token>` header.

## 2. Configure SAP Outbound Call

1. In SAP, create an HTTP destination pointing to your WorkPro server.
2. Set the URL to `https://<workpro-host>/api/hooks/workorder`.
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
curl -X POST https://<workpro-host>/api/hooks/workorder \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event":"create","title":"Example"}'
```

A successful response returns `{"status":"received"}`.


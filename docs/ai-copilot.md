# AI Copilot API

The AI Copilot endpoint centralizes guidance, summarization, and contextual search features for WorkPro operators. It exposes a single REST resource that orchestrates data access and LLM prompts so that the UI can drive multiple conversational tools with a consistent contract.

## Endpoint

| Method | Path        | Description |
| ------ | ----------- | ----------- |
| POST   | `/ai/copilot` | Submits a user prompt, context hints, and runtime options, and responds with a grounded recommendation payload. |

The endpoint is synchronous and intended for UI interactions; use streaming websockets only if specifically enabled downstream by the runtime.

## Request schema

```jsonc
{
  "tenantId": "string",             // required; UUID or slug for data partitioning
  "userId": "string",               // required; used for access control and attribution
  "prompt": "string",               // required; natural language request from the client
  "tools": ["summary", "search"],   // optional; limits which internal skills may run
  "context": {
    "assetIds": ["string"],         // optional; hints to asset or site context
    "workOrderId": "string",        // optional; focuses retrieval on a specific WO
    "timeRange": {
      "from": "ISO-8601",
      "to": "ISO-8601"
    },
    "language": "en"
  },
  "response": {
    "format": "markdown|json",
    "maxTokens": 512,
    "temperature": 0.2
  },
  "telemetry": {
    "sessionId": "uuid",
    "messageId": "uuid"
  }
}
```

Key validation rules:

- `tenantId`, `userId`, and `prompt` must be supplied.
- `tools` defaults to the full skill set (`summary`, `search`, `recommendation`, `sql`) when absent.
- `temperature` must stay within `0.0–0.7` to maintain deterministic output for auditability.

## Response schema

```jsonc
{
  "id": "uuid",                        // trace identifier for observability
  "promptEcho": "string",              // sanitized prompt used in the LLM call
  "content": {
    "type": "markdown",               // currently markdown or json
    "body": "string"                  // final assistant response
  },
  "citations": [
    {
      "sourceId": "string",           // identifier for the retrieved document
      "type": "workOrder|asset|file|sensor",
      "excerpt": "string",
      "url": "https://..."             // deep link for drill-down
    }
  ],
  "actions": [
    {
      "label": "Create work order",
      "type": "workOrder.create",
      "payload": { "assetId": "..." }
    }
  ],
  "usage": {
    "inputTokens": 1200,
    "outputTokens": 350,
    "latencyMs": 1800
  }
}
```

The endpoint always returns `200 OK` with the payload above when successful. Input errors return `422` with validation details, and authorization failures use `403`.

## Data sources and retrieval strategy

1. **Vector index** – embeddings generated from manuals, runbooks, and prior work-order summaries. Queries from the `prompt` and `context` drive semantic search. Each hit is retained for grounding and citation.
2. **Operational data lake** – Postgres/Mongo collections for assets, telemetry snapshots, and CMMS work orders. Structured SQL-like retrieval is used for the `sql` tool.
3. **Real-time telemetry** – latest metrics from the MQTT ingestion service to answer "what is happening now" prompts; only enabled when the requester has the `telemetry:read` scope.

All fetched artifacts are filtered by `tenantId` and by the user’s role claims derived from their session JWT.

## Security considerations

- **Authentication** – requires a JWT bearer token issued by the WorkPro identity service. Tokens must include `sub`, `tenant`, and `scp` (scopes). The backend rejects anonymous access.
- **Authorization** – scopes map to tool usage. For example, `copilot:write` is required to execute recommendation or work-order creation actions, while `copilot:read` suffices for search-only prompts.
- **PII filtering** – prompts are sanitized to remove emails, phone numbers, or other PII before forwarding to external LLM providers. Sensitive context is never logged in plain text.
- **Prompt injection defense** – retrieval snippets are wrapped in signed metadata blocks and truncated to a fixed token budget to prevent untrusted content from overriding system instructions.
- **Rate limiting and auditing** – per-user and per-tenant rate limits protect downstream models. All responses persist an audit record (`id`, `promptEcho`, `citations`) for future review.

## Operational guidance

- Timeouts default to 5 seconds. The client should implement retries with exponential backoff for `5xx` errors.
- Telemetry metadata (`sessionId`, `messageId`) is optional but recommended for correlating multi-turn conversations.
- When `response.format = json`, the LLM is instructed to produce a structured schema used for automated agents downstream; invalid JSON results in a `502` propagated to the caller.

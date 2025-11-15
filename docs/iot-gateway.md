# IoT Gateway Ingestion

The IoT Gateway ingests telemetry from on-premises devices and normalizes it for analytics, monitoring, and downstream automation such as alerting or work-order creation.

## Endpoint overview

| Type | Interface | Description |
| ---- | --------- | ----------- |
| REST | `POST /iot/ingest` | Accepts batched telemetry payloads over HTTPS for devices that cannot publish to MQTT. |
| MQTT | `workpro/<tenant>/<site>/<asset>` | Preferred low-latency path; devices publish JSON payloads to the configured topic hierarchy. |

All traffic must include a tenant identifier and device authentication credentials described in the security section below.

## Payload formats

### HTTP ingest (`/iot/ingest`)

```jsonc
{
  "tenantId": "string",             // required
  "gatewayId": "string",            // required; registered edge gateway
  "messages": [
    {
      "assetId": "string",          // required for routing
      "sensorType": "vibration",    // free-form but must match catalog for analytics
      "ts": "2024-05-12T14:52:00Z", // ISO-8601 timestamp from device or gateway
      "values": {
        "rms": 1.2,
        "temperature": 54.2
      },
      "status": "nominal|warning|fault",
      "labels": { "phase": "A" }
    }
  ]
}
```

### MQTT payload

```jsonc
{
  "deviceId": "edge-123",
  "assetId": "press-5",
  "ts": 1715525520000,          // epoch milliseconds
  "metrics": [
    { "name": "pressure", "value": 420.5, "unit": "psi" },
    { "name": "flow", "value": 13.2, "unit": "lpm" }
  ],
  "quality": "good|suspect",
  "seq": 9982
}
```

MQTT publishes to topics derived from the device metadata: `workpro/{tenantId}/{siteCode}/{assetId}`. The gateway validates that the topic `assetId` matches the payload content.

## Storage model

Telemetry follows a two-tier storage strategy:

1. **Hot path (TimescaleDB/Influx)** – the latest 30 days of high-resolution metrics keyed by `(tenantId, assetId, metricName, timestamp)` for dashboards and near-real-time analytics.
2. **Warm path (object storage + Parquet)** – batch-archived parquet files partitioned by `tenantId`, `site`, `asset`, and `date` for low-cost historical queries.
3. **Event journal (MongoDB)** – discrete events such as gateway health checks, device configuration changes, and alert firings stored with their metadata for quick lookup.

A storage router component fans out each message to the correct sinks based on retention policies defined per tenant.

## Alerting and work-order automation

- **Threshold alerts** – rules are defined per metric (`>`, `<`, `delta`, `rate`). When violated, the gateway emits an `alert.triggered` event that flows to the notification service.
- **Anomaly detection** – optional ML-based detector consumes the hot path stream and emits `anomaly.detected` events with confidence scores.
- **Work-order (WO) automation** – alerts with `autoCreateWorkOrder=true` invoke the maintenance orchestrator, which:
  1. Resolves the asset to its maintenance plan and priority.
  2. Creates a draft work order assigned to the default technician group.
  3. Attaches raw telemetry excerpts and trend plots as evidence.
  4. Emits `workOrder.created` WebSocket events for the UI.

Feedback from technicians (closing or escalating the WO) is looped back to the alerting service to adjust rule sensitivity.

## Security considerations

- **Device identity** – every HTTP request must include a `Gateway-Token` header signed with the gateway’s API key. MQTT clients authenticate using TLS mutual auth certificates issued per device.
- **Tenant isolation** – the API rejects payloads whose `tenantId` does not match the token or certificate subject. Topics are prefixed by tenant to prevent crosstalk.
- **Data validation** – schema validation ensures metrics use known units, timestamps are not older than 24 hours, and payload sizes stay under 256 KB.
- **Replay protection** – each message carries a monotonically increasing `seq`; duplicates within a 5-minute window are dropped.
- **Observability** – ingestion results include a correlation ID returned in the `202 Accepted` response body or MQTT ACK metadata so clients can trace submissions.

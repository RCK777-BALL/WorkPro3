# Observability Baseline

## Logs
- JSON structured logs with request metadata.
- Correlation id through `x-request-id`.

## Metrics
- `GET /metrics` for Prometheus scrape.

## Suggested alerts
- HTTP 5xx error-rate > threshold.
- p95 latency degradation.
- Mongo connectivity failures (`/ready` failures).
- CPU/memory saturation and pod restarts.

## Prometheus scrape snippet
```yaml
- job_name: workpro-backend
  metrics_path: /metrics
  static_configs:
    - targets: ['workpro-backend:5010']
```

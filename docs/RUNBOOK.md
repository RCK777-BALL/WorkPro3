# Operations Runbook

## Incident Triage
1. Check `/health/ready` and `/metrics` endpoints.
2. Inspect application logs for request IDs and tenant context.
3. Validate database connectivity.

## Recovery Steps
- Restart pods if unhealthy.
- Roll back to previous image tag if errors persist.

## Routine Checks
- Verify backup jobs for MongoDB.
- Review alerting dashboards for error rates.

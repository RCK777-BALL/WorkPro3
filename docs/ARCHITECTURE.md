# WorkPro3 Architecture

## System Overview
WorkPro3 is a multi-tenant CMMS platform with a React/Vite frontend and a Node/Express + MongoDB backend. The repository contains both the legacy backend (`/backend`) and a new modular backend structure (`/backend/src/modules`). The frontend consumes API endpoints that are scoped to a tenant/site context and protected by RBAC permissions.

## Repository Layout
```
/docs                   Documentation and runbooks
/shared                 Shared DTOs, enums, and validators
/backend                Backend API (Express, MongoDB)
  /src
    /modules             Domain modules (assets, work-orders, inventory, etc.)
    /routes              API routes
    /models              Mongoose models
/frontend               React/Vite frontend
/k8s                    Kubernetes manifests
```

## Key Design Principles
- **Tenant scoping:** All domain data is scoped to `tenantId` and optional `siteId`.
- **Shared contracts:** `/shared/types` is the source of truth for DTOs and enums.
- **RBAC:** Access is enforced server-side via permission middleware.
- **Auditability:** Changes to critical records are logged to append-only audit logs.
- **Fail-fast config:** Environment validation runs at startup in production.

## High-Level Data Flow
1. **Client** authenticates and receives JWT.
2. **API** validates auth + permissions, applies tenant scope.
3. **Services** perform domain logic and write to MongoDB.
4. **Audit middleware** records critical actions.

## Integration Points
- Optional Kafka/MQTT integrations for telemetry and event-driven processing.
- Metrics endpoints for monitoring.

## Deployment Notes
- Use `k8s/` manifests and `docs/DEPLOYMENT.md` for production guidance.
- Environment configuration is documented in `.env.sample` files and `docs/SECRETS.md`.

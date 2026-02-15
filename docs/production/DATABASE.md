# Database Production Readiness (MongoDB)

## Required production posture
- Enable authentication and least-privilege DB users.
- Prefer TLS-enabled MongoDB connections in production.
- Restrict network exposure to app subnets/security groups.

## Indexes
- WorkOrders:
  - `{ tenantId: 1, status: 1, createdAt: -1 }`
  - `{ tenantId: 1, assetId: 1, createdAt: -1 }`
  - `{ tenantId: 1, line: 1, createdAt: -1 }`
- Assets (existing):
  - `{ tenantId: 1, lineId: 1 }`
  - `{ tenantId: 1, stationId: 1 }`
  - plus tenant/site/plant combinations.

## Operational command
- `npm --prefix backend run indexes:ensure`

## Backups
- Atlas: enable continuous backups and PITR.
- Self-managed: scheduled `mongodump`, encrypted offsite storage, restore drills.

## Seeding policy
- Never auto-seed production unless explicitly enabled by env-gated scripts.

# MongoDB Production Posture

## Backups
- Use daily backups stored off-cluster.
- Test restore procedures monthly.

## Index Strategy
- Maintain indexes on tenant/site scoped queries.
- Review slow queries and add compound indexes where needed.

## Security
- Enforce TLS for production clusters.
- Use least-privilege database users.

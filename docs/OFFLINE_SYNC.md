# Offline Sync

## Client Behavior
- Offline actions are queued locally with an idempotency key.
- Each action tracks status: `pending`, `succeeded`, `failed`.
- Users can retry failed actions.

## Server Behavior
- `/sync/actions` records actions with idempotency keys.
- Duplicate idempotency keys return success without reprocessing.
- Conflicts should be resolved by preferring server state unless the client explicitly overrides.

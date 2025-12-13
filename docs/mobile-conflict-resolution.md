# Mobile sync conflict resolution

This backend now performs deterministic, last-writer-wins (LWW) resolution for mobile/offline sync updates with extra handling for field-level merges and checklists.

## Record-level arbitration
- Every update compares the server `updatedAt` timestamp with the client-supplied `version` (interpreted as a timestamp) and optional vector clock (`vector`).
- Vector clocks are compared when timestamps tie; if the vectors also tie, resolution falls back to a deterministic ordering based on the `clientId` (or the associated user ID) versus the literal `server` label.
- When the server wins the record-level comparison, incoming changes are rejected unless field-level logic overrides specific fields.

## Field-level merges
- Notes and description fields run their own LWW checks using optional `fieldTimestamps` so fresher client edits can land even if other parts of the record are older.
- Checklist updates are merged by stable item identifiers (`id`, `_id`, or text fallback), applying LWW per item:
  - New items are accepted when the client wins the timestamp/vector comparison.
  - Edits win or lose per item; deleted items are respected when the client wins.
  - Ordering is deterministic because merged checklists are sorted by item identifier.

## Resolution metadata for clients
- `pushActions` responses now return a `resolutions` array (also aliased to `conflicts` for backward compatibility) describing how each update was resolved, including:
  - `resolvedWith` (`server`, `client`, or `mixed`),
  - applied vs. discarded fields,
  - per-field decisions, and per-item checklist outcomes.
- Clients can replay these records to align local state—applying server-won fields, removing discarded edits, and reconciling checklist items.

## Edge cases and tie-breaking
- Edits vs. deletes: a delete only wins when its timestamp/vector wins for that item; otherwise the server keeps the item.
- New checklist entries always include their identifier so merges stay stable; missing identifiers fall back to a text-based key but should be avoided client-side.
- When timestamps and vectors tie, the `clientId` vs. `server` lexical comparison breaks ties to ensure deterministic results across devices.

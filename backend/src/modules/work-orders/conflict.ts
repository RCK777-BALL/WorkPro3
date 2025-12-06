export interface WorkOrderSnapshot {
  id: string;
  version: number;
  payload: Record<string, unknown>;
}

export interface WorkOrderChange {
  id: string;
  version: number;
  payload: Record<string, unknown>;
  media?: { name: string; type: string; dataUrl: string; capturedAt: number }[];
}

export interface ConflictResolution {
  merged: Record<string, unknown>;
  conflicts: string[];
  applyChange: boolean;
}

/**
 * Performs a minimal conflict resolution by comparing optimistic local versions
 * with the latest server snapshot. If the snapshot version is newer we keep
 * server fields unless the local payload mutated the field.
 */
export function resolveWorkOrderConflict(
  snapshot: WorkOrderSnapshot,
  change: WorkOrderChange
): ConflictResolution {
  if (change.version >= snapshot.version) {
    return { merged: { ...snapshot.payload, ...change.payload }, conflicts: [], applyChange: true };
  }

  const conflicts: string[] = [];
  const merged: Record<string, unknown> = { ...snapshot.payload };
  Object.entries(change.payload).forEach(([key, value]) => {
    const serverValue = snapshot.payload[key];
    if (serverValue !== value) {
      conflicts.push(key);
    }
    merged[key] = value;
  });

  return {
    merged,
    conflicts,
    applyChange: conflicts.length === 0,
  };
}

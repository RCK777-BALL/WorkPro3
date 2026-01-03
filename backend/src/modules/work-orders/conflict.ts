import type { WorkOrderDocument } from '../../../models/WorkOrder';

export type WorkOrderPayload = Record<string, unknown> | WorkOrderDocument;

const normalizePayload = (payload: WorkOrderPayload): Record<string, unknown> => {
  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  return {};
};

export interface WorkOrderSnapshot<TPayload extends WorkOrderPayload = WorkOrderPayload> {
  id: string;
  version: number;
  payload: TPayload;
}

export interface WorkOrderTimestampSnapshot<TPayload extends WorkOrderPayload = WorkOrderPayload> {
  id: string;
  updatedAt: Date;
  payload: TPayload;
}

export interface WorkOrderChange<TPayload extends WorkOrderPayload = WorkOrderPayload> {
  id: string;
  version: number;
  payload: TPayload;
  media?: { name: string; type: string; dataUrl: string; capturedAt: number }[];
}

export interface WorkOrderTimestampChange<TPayload extends WorkOrderPayload = WorkOrderPayload> {
  id: string;
  clientUpdatedAt: Date;
  payload: TPayload;
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
  const snapshotPayload = normalizePayload(snapshot.payload);
  const changePayload = normalizePayload(change.payload);
  if (change.version >= snapshot.version) {
    return { merged: { ...snapshotPayload, ...changePayload }, conflicts: [], applyChange: true };
  }

  const conflicts: string[] = [];
  const merged: Record<string, unknown> = { ...snapshotPayload };
  Object.entries(changePayload).forEach(([key, value]) => {
    const serverValue = snapshotPayload[key];
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

export function resolveWorkOrderTimestampConflict(
  snapshot: WorkOrderTimestampSnapshot,
  change: WorkOrderTimestampChange
): ConflictResolution {
  const snapshotPayload = normalizePayload(snapshot.payload);
  const changePayload = normalizePayload(change.payload);
  if (change.clientUpdatedAt >= snapshot.updatedAt) {
    return { merged: { ...snapshotPayload, ...changePayload }, conflicts: [], applyChange: true };
  }

  const conflicts: string[] = [];
  const merged: Record<string, unknown> = { ...snapshotPayload };
  Object.entries(changePayload).forEach(([key, value]) => {
    const serverValue = snapshotPayload[key];
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

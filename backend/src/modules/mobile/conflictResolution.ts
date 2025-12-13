/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';

export type VectorClock = Record<string, number>;

export type ResolutionSource = 'server' | 'client' | 'mixed';

export interface ChecklistResolution {
  itemId: string;
  resolvedWith: ResolutionSource;
  change: 'added' | 'updated' | 'deleted' | 'unchanged';
}

export interface ResolutionMetadata {
  entityType: string;
  entityId: string;
  resolvedWith: ResolutionSource;
  serverTimestamp?: Date;
  clientTimestamp?: Date;
  serverVector?: VectorClock;
  clientVector?: VectorClock;
  clientId?: string;
  appliedFields: string[];
  discardedFields: string[];
  fieldResolutions: Record<string, ResolutionSource>;
  checklistResolutions: ChecklistResolution[];
}

export interface ConflictResolutionInput {
  existing: Record<string, any> | null;
  incoming: Record<string, any>;
  entityType: string;
  entityId: string | Types.ObjectId;
  clientTimestamp?: Date;
  clientVector?: VectorClock;
  clientId?: string;
  fieldTimestamps?: Record<string, number>;
}

const toDate = (value?: number | string | Date): Date | undefined => {
  if (value === undefined || value === null) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeId = (value: any): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && '_id' in value) return String((value as any)._id);
  return JSON.stringify(value);
};

const compareVector = (serverVector?: VectorClock, clientVector?: VectorClock): ResolutionSource | 'tie' => {
  if (!serverVector && !clientVector) return 'tie';
  if (serverVector && !clientVector) return 'server';
  if (!serverVector && clientVector) return 'client';

  const participants = new Set<string>([
    ...Object.keys(serverVector ?? {}),
    ...Object.keys(clientVector ?? {}),
  ]);

  let serverAhead = false;
  let clientAhead = false;

  for (const participant of participants) {
    const serverValue = serverVector?.[participant] ?? 0;
    const clientValue = clientVector?.[participant] ?? 0;

    if (serverValue > clientValue) serverAhead = true;
    if (clientValue > serverValue) clientAhead = true;
  }

  if (serverAhead && !clientAhead) return 'server';
  if (clientAhead && !serverAhead) return 'client';
  return 'tie';
};

const tieBreaker = (clientId?: string): ResolutionSource => {
  if (!clientId) return 'server';
  return clientId.localeCompare('server') < 0 ? 'client' : 'server';
};

const pickWinner = (
  serverTimestamp?: Date,
  clientTimestamp?: Date,
  serverVector?: VectorClock,
  clientVector?: VectorClock,
  clientId?: string,
): ResolutionSource => {
  const hasServer = !!serverTimestamp;
  const hasClient = !!clientTimestamp;

  if (hasServer && hasClient && serverTimestamp!.getTime() !== clientTimestamp!.getTime()) {
    return serverTimestamp!.getTime() > clientTimestamp!.getTime() ? 'server' : 'client';
  }

  if (hasServer && !hasClient) return 'server';
  if (!hasServer && hasClient) return 'client';

  const vectorWinner = compareVector(serverVector, clientVector);
  if (vectorWinner !== 'tie') return vectorWinner;

  return tieBreaker(clientId);
};

const mergeChecklist = (
  existing: any[] = [],
  incoming: any[] = [],
  options: {
    serverVector?: VectorClock;
    clientVector?: VectorClock;
    clientTimestamp?: Date;
    serverTimestamp?: Date;
  },
): { merged: any[]; metadata: ChecklistResolution[]; appliedIds: Set<string>; discardedIds: Set<string> } => {
  const serverMap = new Map<string, any>();
  const clientMap = new Map<string, any>();

  for (const item of existing) {
    const key = normalizeId(item.id ?? item._id ?? item.text);
    serverMap.set(key, item);
  }

  for (const item of incoming) {
    const key = normalizeId(item.id ?? item._id ?? item.text);
    clientMap.set(key, item);
  }

  const allKeys = Array.from(new Set<string>([...serverMap.keys(), ...clientMap.keys()])).sort();
  const merged: any[] = [];
  const metadata: ChecklistResolution[] = [];
  const appliedIds = new Set<string>();
  const discardedIds = new Set<string>();

  for (const key of allKeys) {
    const serverItem = serverMap.get(key);
    const clientItem = clientMap.get(key);

    if (!clientItem) {
      merged.push(serverItem);
      metadata.push({ itemId: key, resolvedWith: 'server', change: 'unchanged' });
      continue;
    }

    const clientMarkedDeleted = Boolean((clientItem as any)?.deleted || (clientItem as any)?._deleted);
    const serverTimestamp = toDate(serverItem?.updatedAt ?? options.serverTimestamp);
    const clientTimestamp = toDate(clientItem?.updatedAt ?? options.clientTimestamp);

    const winner = pickWinner(serverTimestamp, clientTimestamp, options.serverVector, options.clientVector);

    if (clientMarkedDeleted && winner === 'client') {
      metadata.push({ itemId: key, resolvedWith: 'client', change: 'deleted' });
      discardedIds.add(key);
      continue;
    }

    if (!serverItem) {
      merged.push(clientItem);
      appliedIds.add(key);
      metadata.push({ itemId: key, resolvedWith: 'client', change: 'added' });
      continue;
    }

    const resolvedWith = winner;
    const mergedItem = resolvedWith === 'client' ? { ...serverItem, ...clientItem } : serverItem;
    merged.push(mergedItem);

    if (resolvedWith === 'client') {
      appliedIds.add(key);
    } else if (resolvedWith === 'server') {
      discardedIds.add(key);
    }

    metadata.push({ itemId: key, resolvedWith, change: 'updated' });
  }

  return { merged, metadata, appliedIds, discardedIds };
};

export const resolveConflict = (
  input: ConflictResolutionInput,
): { merged: Record<string, any>; metadata: ResolutionMetadata; applyChange: boolean } => {
  const serverTimestamp = toDate(input.existing?.updatedAt);
  const clientTimestamp = input.clientTimestamp;
  const recordWinner = pickWinner(
    serverTimestamp,
    clientTimestamp,
    (input.existing as any)?.syncVector,
    input.clientVector,
    input.clientId,
  );

  const appliedFields: string[] = [];
  const discardedFields: string[] = [];
  const fieldResolutions: Record<string, ResolutionSource> = {};

  const merged: Record<string, any> = recordWinner === 'client'
    ? { ...(input.existing ?? {}), ...input.incoming }
    : { ...(input.existing ?? {}) };

  const resolveField = (field: string, serverValue: any, clientValue: any) => {
    const fieldTimestamp = input.fieldTimestamps?.[field];
    const fieldClientTimestamp = fieldTimestamp ? toDate(fieldTimestamp) : clientTimestamp;
    const winner = pickWinner(serverTimestamp, fieldClientTimestamp, undefined, input.clientVector, input.clientId);
    fieldResolutions[field] = winner;

    if (winner === 'client' && clientValue !== undefined) {
      merged[field] = clientValue;
      appliedFields.push(field);
    } else if (winner === 'server') {
      discardedFields.push(field);
    }
  };

  if ('notes' in input.incoming) {
    resolveField('notes', input.existing?.notes, input.incoming.notes);
  }

  if ('description' in input.incoming) {
    resolveField('description', input.existing?.description, input.incoming.description);
  }

  const hasChecklist = 'checklist' in input.incoming || Array.isArray(input.existing?.checklist);
  if (hasChecklist) {
    const { merged: checklistMerged, metadata, appliedIds, discardedIds } = mergeChecklist(
      input.existing?.checklist ?? [],
      (input.incoming as any).checklist ?? [],
      {
        serverTimestamp,
        clientTimestamp,
        serverVector: (input.existing as any)?.syncVector,
        clientVector: input.clientVector,
      },
    );

    merged.checklist = checklistMerged;

    if (appliedIds.size > 0) appliedFields.push('checklist');
    if (discardedIds.size > 0) discardedFields.push('checklist');
    fieldResolutions.checklist = appliedIds.size > 0 && discardedIds.size > 0 ? 'mixed'
      : appliedIds.size > 0
        ? 'client'
        : discardedIds.size > 0
          ? 'server'
          : recordWinner;

    return {
      merged,
      metadata: {
        entityType: input.entityType,
        entityId: normalizeId(input.entityId),
        resolvedWith: recordWinner,
        serverTimestamp,
        clientTimestamp,
        serverVector: (input.existing as any)?.syncVector,
        clientVector: input.clientVector,
        clientId: input.clientId,
        appliedFields,
        discardedFields,
        fieldResolutions,
        checklistResolutions: metadata,
      },
      applyChange: recordWinner !== 'server' || appliedFields.length > 0,
    };
  }

  return {
    merged,
    metadata: {
      entityType: input.entityType,
      entityId: normalizeId(input.entityId),
      resolvedWith: recordWinner,
      serverTimestamp,
      clientTimestamp,
      serverVector: (input.existing as any)?.syncVector,
      clientVector: input.clientVector,
      clientId: input.clientId,
      appliedFields,
      discardedFields,
      fieldResolutions,
      checklistResolutions: [],
    },
    applyChange: recordWinner !== 'server' || appliedFields.length > 0,
  };
};

/*
 * SPDX-License-Identifier: MIT
 */

import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import type { AuthedRequestHandler } from '../types/http';
import MobileOfflineAction from '../models/MobileOfflineAction';
import MobileSyncConflict from '../models/MobileSyncConflict';
import MobileDeviceTelemetry from '../models/MobileDeviceTelemetry';
import { resolveConflictWithPolicy, upsertDeviceTelemetry } from '../services/mobileSyncAdminService';
import { computeListEtag, handleConditionalListRequest } from '../services/mobileSyncService';
import { writeAuditLog } from '../utils/audit';

const parseString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export const listPendingQueues: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant context is required' });
    return;
  }

  const userId = parseString(req.query.userId);
  const deviceId = parseString(req.query.deviceId);
  const status = parseString(req.query.status);

  const filter: FilterQuery<any> = { tenantId };
  if (userId && Types.ObjectId.isValid(userId)) {
    filter.userId = new Types.ObjectId(userId);
  }
  if (deviceId) {
    filter['payload.deviceId'] = deviceId;
  }
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $in: ['pending', 'failed'] } as any;
  }

  const actions = await MobileOfflineAction.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const etag = computeListEtag(actions);
  if (handleConditionalListRequest(req, res, etag)) {
    return;
  }

  res.json({ data: actions });
};

export const listConflictSummaries: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant context is required' });
    return;
  }

  const status = parseString(req.query.status);
  const resolution = parseString(req.query.resolution);
  const deviceId = parseString(req.query.deviceId);

  const filter: FilterQuery<any> = { tenantId };
  if (status) filter.status = status;
  if (resolution) filter.resolution = resolution;
  if (deviceId) filter.deviceId = deviceId;

  const conflicts = await MobileSyncConflict.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const etag = computeListEtag(conflicts);
  if (handleConditionalListRequest(req, res, etag)) return;

  const summaries = conflicts.map((conflict) => ({
    id: conflict._id?.toString(),
    status: conflict.status,
    resolution: conflict.resolution,
    entityType: conflict.entityType,
    entityId: conflict.entityId,
    deviceId: conflict.deviceId,
    serverVersion: conflict.serverVersion,
    clientVersion: conflict.clientVersion,
    resolvedBy: conflict.resolvedBy?.toString(),
    resolvedAt: conflict.resolvedAt,
    createdAt: conflict.createdAt,
  }));

  res.json({ data: summaries });
};

export const resolveConflict: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const conflictId = parseString(req.params?.id);
  const body = (req.body ?? {}) as Partial<{ resolution: unknown; notes: unknown }>;
  const resolution = parseString(body.resolution);
  const notes = parseString(body.notes);

  if (!conflictId || !Types.ObjectId.isValid(conflictId)) {
    res.status(400).json({ message: 'A valid conflict id is required' });
    return;
  }

  if (resolution !== 'server' && resolution !== 'client' && resolution !== 'manual') {
    res.status(400).json({ message: 'Resolution must be server, client or manual' });
    return;
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const actor = req.user
    ? {
        id: req.user._id ?? req.user.id,
        name: (req.user as any).name,
        email: (req.user as any).email,
      }
    : undefined;

  const updated = await resolveConflictWithPolicy(
    conflictId,
    tenantObjectId,
    new Types.ObjectId(userId),
    resolution,
    notes,
    actor,
  );

  if (!updated) {
    res.status(404).json({ message: 'Conflict not found' });
    return;
  }

  res.json({ data: updated });
};

export const listDeviceTelemetry: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ message: 'Tenant context is required' });
    return;
  }

  const userId = parseString(req.query.userId);
  const deviceId = parseString(req.query.deviceId);

  const filter: FilterQuery<any> = { tenantId };
  if (userId && Types.ObjectId.isValid(userId)) {
    filter.userId = new Types.ObjectId(userId);
  }
  if (deviceId) filter.deviceId = deviceId;

  const telemetry = await MobileDeviceTelemetry.find(filter).sort({ lastSeenAt: -1 }).limit(200).lean();
  const etag = computeListEtag(telemetry);
  if (handleConditionalListRequest(req, res, etag)) return;

  res.json({ data: telemetry });
};

export const recordConflictFromClient: AuthedRequestHandler = async (req, res) => {
  const tenantId = req.tenantId;
  const userId = req.user?._id ?? req.user?.id;
  if (!tenantId || !userId) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const body = (req.body ?? {}) as Partial<{
    deviceId: unknown;
    entityType: unknown;
    entityId: Types.ObjectId | string;
    serverVersion?: number;
    clientVersion?: number;
    payload?: Record<string, unknown>;
  }>;

  const deviceId = parseString(body.deviceId);
  const entityType = parseString(body.entityType);
  if (!deviceId || !entityType) {
    res.status(400).json({ message: 'deviceId and entityType are required' });
    return;
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const conflict = await MobileSyncConflict.create({
    tenantId: tenantObjectId,
    userId: new Types.ObjectId(userId),
    deviceId,
    entityType,
    entityId: body.entityId,
    serverVersion: body.serverVersion,
    clientVersion: body.clientVersion,
    payload: body.payload ?? {},
    status: 'pending',
  });

  await upsertDeviceTelemetry({
    tenantId: tenantObjectId,
    userId: new Types.ObjectId(userId),
    deviceId,
    conflictDelta: 1,
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: 'mobile.conflict.reported',
    entityType: 'MobileSyncConflict',
    entityId: conflict._id,
    after: conflict.toObject(),
  });

  res.status(201).json({ data: conflict });
};

/*
 * SPDX-License-Identifier: MIT
 */

import type { Types } from 'mongoose';
import MobileDeviceTelemetry from '../models/MobileDeviceTelemetry';
import MobileSyncConflict, { type MobileConflictResolution } from '../models/MobileSyncConflict';
import type { AuditActor } from '../utils';
import { writeAuditLog } from '../utils';

export interface DeviceTelemetryInput {
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  deviceId?: string;
  platform?: string;
  appVersion?: string;
  lastFailureReason?: string;
  pendingDelta?: number;
  failedDelta?: number;
  conflictDelta?: number;
}

export const upsertDeviceTelemetry = async (input: DeviceTelemetryInput): Promise<void> => {
  const { tenantId, userId, deviceId, platform, appVersion, lastFailureReason } = input;
  if (!tenantId || !deviceId) return;

  const pendingDelta = input.pendingDelta ?? 0;
  const failedDelta = input.failedDelta ?? 0;
  const conflictDelta = input.conflictDelta ?? 0;

  await MobileDeviceTelemetry.findOneAndUpdate(
    { tenantId, deviceId },
    {
      $set: {
        ...(userId ? { userId } : {}),
        ...(platform ? { platform } : {}),
        ...(appVersion ? { appVersion } : {}),
        lastSeenAt: new Date(),
        ...(lastFailureReason ? { lastFailureReason } : {}),
      },
      $inc: {
        pendingActions: pendingDelta,
        failedActions: failedDelta,
        totalConflicts: conflictDelta,
      },
      $max: {
        lastSyncAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).exec();
};

export const resolveConflictWithPolicy = async (
  conflictId: string,
  tenantId: Types.ObjectId,
  userId: Types.ObjectId,
  resolution: MobileConflictResolution,
  notes?: string,
  actor?: AuditActor,
): Promise<Awaited<ReturnType<typeof MobileSyncConflict.findById>> | null> => {
  const conflict = await MobileSyncConflict.findOne({ _id: conflictId, tenantId });
  if (!conflict) {
    return null;
  }

  const before = conflict.toObject();
  conflict.status = 'resolved';
  conflict.resolution = resolution;
  conflict.resolvedBy = userId;
  conflict.resolvedAt = new Date();
  conflict.resolutionNotes = notes ?? ''; // Assign an empty string if notes is undefined
  await conflict.save();

  await writeAuditLog({
    tenantId,
    userId,
    ...(actor ? { actor } : {}),
    action: 'mobile.conflict.resolved',
    entityType: 'MobileSyncConflict',
    entityId: conflict._id,
    before,
    after: conflict.toObject(),
  });

  if (conflict.deviceId) {
    await upsertDeviceTelemetry({
      tenantId,
      userId,
      deviceId: conflict.deviceId,
      conflictDelta: 1,
    });
  }

  return conflict;
};

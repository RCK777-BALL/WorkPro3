/*
 * SPDX-License-Identifier: MIT
 */

import type { Server } from 'socket.io';
import Alert from '../models/Alert';

export interface EmitAlertOptions {
  tenantId?: string;
  plantId: string;
  type: 'downtime' | 'wrenchTime' | 'pmCompliance' | 'iot';
  level: 'info' | 'warning' | 'critical';
  message: string;
  assetId?: string;
  metric?: string;
}

export async function emitAlert(
  io: Server | undefined,
  { tenantId, plantId, type, level, message, assetId, metric }: EmitAlertOptions,
) {
  const alert = await Alert.create({
    tenantId,
    plant: plantId,
    type,
    level,
    message,
    asset: assetId,
    metric,
  });
  if (io) {
    io.emit('alert:new', {
      ...alert.toObject(),
      _id: alert._id.toString(),
      plant: alert.plant.toString(),
      asset: alert.asset?.toString(),
    });
  }
  return alert;
}

/*
 * SPDX-License-Identifier: MIT
 */

import type { Server } from 'socket.io';
import Alert from '../models/Alert';

export interface EmitAlertOptions {
  tenantId?: string;
  plantId: string;
  type: 'downtime' | 'wrenchTime' | 'pmCompliance';
  level: 'info' | 'warning' | 'critical';
  message: string;
}

export async function emitAlert(
  io: Server | undefined,
  { tenantId, plantId, type, level, message }: EmitAlertOptions,
) {
  const alert = await Alert.create({
    tenantId,
    plant: plantId,
    type,
    level,
    message,
  });
  if (io) {
    io.emit('alert:new', {
      ...alert.toObject(),
      _id: alert._id.toString(),
      plant: alert.plant.toString(),
    });
  }
  return alert;
}

/*
 * SPDX-License-Identifier: MIT
 */

import crypto from 'crypto';
import type { Request } from 'express';

export interface SessionBinding {
  ipHash?: string;
  userAgent?: string;
  deviceId?: string;
}

const hashValue = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const buildSessionBinding = (req: Request): SessionBinding => {
  const userAgent = req.get('user-agent') ?? undefined;
  const deviceId = typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined;
  const ip = req.ip || (req.connection?.remoteAddress as string | undefined);
  const ipHash = ip ? hashValue(`${ip}|${userAgent ?? ''}`) : undefined;

  return {
    ipHash,
    userAgent,
    deviceId,
  };
};

export const isSessionBindingValid = (expected: SessionBinding | undefined, req: Request): boolean => {
  if (!expected || (!expected.ipHash && !expected.userAgent && !expected.deviceId)) {
    return true;
  }

  const current = buildSessionBinding(req);
  if (expected.ipHash && current.ipHash && expected.ipHash !== current.ipHash) {
    return false;
  }

  if (expected.deviceId && current.deviceId && expected.deviceId !== current.deviceId) {
    return false;
  }

  if (expected.userAgent && current.userAgent && expected.userAgent !== current.userAgent) {
    return false;
  }

  return true;
};

export default { buildSessionBinding, isSessionBindingValid };

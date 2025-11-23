/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequest } from '../../../types/http';
import { mobileSyncPullSchema, mobileSyncPushSchema } from '../../../validation/mobileSync';
import { fetchDeltas, applyOfflineActions } from './service';

export const pullDeltas = async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = mobileSyncPullSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  if (!req.tenantId) {
    res.status(400).json({ message: 'Tenant is required' });
    return;
  }

  const data = await fetchDeltas(req.tenantId, parsed.data.lastSync);
  res.json({ data });
};

export const pushActions = async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = mobileSyncPushSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    return;
  }

  if (!req.tenantId || !req.user?._id) {
    res.status(400).json({ message: 'Tenant and user are required' });
    return;
  }

  const userId = new Types.ObjectId(req.user._id);
  const tenantId = new Types.ObjectId(req.tenantId);

  const formattedActions = parsed.data.actions.map((action) => ({
    ...action,
    tenantId,
    userId,
    entityId: action.entityId ? new Types.ObjectId(action.entityId) : undefined,
  }));

  const result = await applyOfflineActions(formattedActions as any);
  res.status(200).json({ data: result });
};

export default {
  pullDeltas,
  pushActions,
};

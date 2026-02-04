/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';
import { recordSyncActions, type SyncActionInput } from '../services/sync.service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId || !req.user?._id) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const syncActionsHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const actions = (req.body?.actions ?? []) as SyncActionInput[];
    const results = await recordSyncActions(req.tenantId, String(req.user._id), actions);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};

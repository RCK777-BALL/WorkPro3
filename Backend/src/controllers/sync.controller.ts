/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { AuthedRequest, AuthedRequestHandler, AuthedRequestWithUser } from '../../types/http';
import { recordSyncActions, type SyncActionInput } from '../services/sync.service';

type SyncActionsRequestBody = {
  actions?: SyncActionInput[];
};

const ensureTenant = (
  req: AuthedRequest,
  res: Response,
): req is AuthedRequestWithUser & { tenantId: string; user: { _id: string } } => {
  if (!req.tenantId || !req.user?._id) {
    res.status(401).json({ message: 'Missing tenant scope' });
    return false;
  }
  return true;
};

export const syncActionsHandler: AuthedRequestHandler<
  ParamsDictionary,
  unknown,
  SyncActionsRequestBody
> = async (req, res, next) => {
  try {
    if (!ensureTenant(req, res)) return;
    const actions = ((req.body as { actions?: SyncActionInput[] } | undefined)?.actions ?? []) as SyncActionInput[];
    const results = await recordSyncActions(req.tenantId, String(req.user._id), actions);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};

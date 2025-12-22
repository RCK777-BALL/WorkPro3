/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../../../types/http';
import { fail } from '../../lib/http';
import { downtimeCreateSchema, downtimeListQuerySchema, downtimeUpdateSchema } from './schemas';
import { createDowntimeLog, listDowntimeLogs, updateDowntimeLog } from '../../../services/downtimeLogs';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

export const listDowntimeHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = downtimeListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const logs = await listDowntimeLogs(req.tenantId, parsed.data);
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

export const createDowntimeHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = downtimeCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const created = await createDowntimeLog(req.tenantId, parsed.data);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateDowntimeHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = downtimeUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }

  if (!ensureTenant(req, res)) return;

  try {
    const updated = await updateDowntimeLog(req.tenantId, req.params.id, parsed.data);
    if (!updated) {
      fail(res, 'Not found', 404);
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

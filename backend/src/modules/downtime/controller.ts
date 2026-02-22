/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import type { AuthedRequest } from '../../../types/http';
import { fail } from '../../lib/http';
import { downtimeCreateSchema, downtimeListQuerySchema, downtimeUpdateSchema } from './schemas';
import { createDowntimeLog, listDowntimeLogs, updateDowntimeLog } from '../../../services/downtimeLogs';
const parseObjectId = (value: string, res: Response, label: string): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(value)) {
    fail(res, `Invalid ${label}`, 400);
    return null;
  }
  return new Types.ObjectId(value);
};

export const listDowntimeHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = downtimeListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    fail(res, parsed.error.errors.map((issue) => issue.message).join(', '), 400);
    return;
  }

  try {
    const logs = await listDowntimeLogs(req.tenantId!, parsed.data);
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

  try {
    const assetId = parseObjectId(parsed.data.assetId, res, 'asset id');
    if (!assetId) return;
    const { start, end, reason } = parsed.data;
    if (!start) {
      fail(res, 'Start time is required', 400);
      return;
    }
    const created = await createDowntimeLog(req.tenantId!, {
      assetId,
      start,
      end,
      reason,
    });
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

  try {
    const { assetId: assetIdRaw, ...rest } = parsed.data;
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;   
    const assetId = assetIdRaw ? parseObjectId(assetIdRaw, res, 'asset id') : undefined;
    if (assetIdRaw && !assetId) return;
    const payload = {
      ...rest,
      ...(assetId ? { assetId } : {}),
    };
    const updated = await updateDowntimeLog(req.tenantId!, id, payload);
    if (!updated) {
      fail(res, 'Not found', 404);
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

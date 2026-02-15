/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import FeatureFlag from '../models/FeatureFlag';
import { writeAuditLog, toEntityId } from '../utils';
import type { AuthedRequest } from '../types/http';
import type { EntityIdLike } from '../utils';

const getTenantContext = (req: AuthedRequest) => {
  const tenantId = req.tenantId;
  if (!tenantId) {
    throw Object.assign(new Error('Tenant context required'), { status: 400 });
  }
  return tenantId;
};

const resolveUserId = (req: AuthedRequest): EntityIdLike => {
  const candidate = req.user?.id ?? req.user?._id;
  if (typeof candidate === 'string' || (typeof candidate === 'object' && (candidate as unknown) instanceof Types.ObjectId)) {
    return candidate;
  }
  return undefined;
};

export const listFeatureFlags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantContext(req as AuthedRequest);
    const siteId = (req as AuthedRequest).siteId ?? null;
    const flags = await FeatureFlag.find({ tenantId, siteId }).sort({ key: 1 }).lean();
    res.json(flags);
  } catch (error) {
    next(error);
  }
};

export const createFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantContext(req as AuthedRequest);
    const siteId = (req as AuthedRequest).siteId ?? null;
    const { key, name, description, enabled, metadata } = req.body ?? {};

    if (!key || typeof key !== 'string' || !key.trim()) {
      res.status(400).json({ message: 'Feature flag key is required.' });
      return;
    }

    const payload = {
      key: key.trim(),
      name: typeof name === 'string' ? name.trim() : undefined,
      description: typeof description === 'string' ? description.trim() : undefined,
      enabled: Boolean(enabled),
      metadata: typeof metadata === 'object' && metadata ? metadata : undefined,
      tenantId,
      siteId,
    };

    const flag = await FeatureFlag.findOneAndUpdate(
      { tenantId, siteId, key: payload.key },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await writeAuditLog({
      tenantId,
      siteId,
      userId: resolveUserId(req as AuthedRequest),
      action: 'featureFlags.create',
      entityType: 'FeatureFlag',
      entityId: toEntityId(flag._id as EntityIdLike),
      after: flag,
    });

    res.status(201).json(flag);
  } catch (error) {
    next(error);
  }
};

export const updateFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantContext(req as AuthedRequest);
    const siteId = (req as AuthedRequest).siteId ?? null;
    const { id } = req.params;
    const { name, description, enabled, metadata } = req.body ?? {};

    const existing = await FeatureFlag.findOne({ _id: id, tenantId, siteId }).lean();
    if (!existing) {
      res.status(404).json({ message: 'Feature flag not found.' });
      return;
    }

    const update = {
      ...(typeof name === 'string' ? { name: name.trim() } : {}),
      ...(typeof description === 'string' ? { description: description.trim() } : {}),
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(typeof enabled === 'number' ? { enabled: Boolean(enabled) } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    const flag = await FeatureFlag.findOneAndUpdate(
      { _id: id, tenantId, siteId },
      { $set: update },
      { new: true },
    );

    if (!flag) {
      res.status(404).json({ message: 'Feature flag not found.' });
      return;
    }

    await writeAuditLog({
      tenantId,
      siteId,
      userId: resolveUserId(req as AuthedRequest),
      action: 'featureFlags.update',
      entityType: 'FeatureFlag',
      entityId: toEntityId(flag._id as EntityIdLike),
      before: existing,
      after: flag,
    });

    res.json(flag);
  } catch (error) {
    next(error);
  }
};


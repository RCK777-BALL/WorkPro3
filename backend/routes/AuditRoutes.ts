/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';
import AuditLog, { type AuditLogDocument, type AuditLogDiffEntry } from '../models/AuditLog';
import { createNotification } from '../services/notificationService';
import type { AuthedRequest } from '../types/http';
import { ensureTenantContext, scopeQueryToTenant, withPolicyGuard, type TenantScopedRequest } from '../src/auth/accessControl';
import { requirePermission } from '../src/auth/permissions';
import logger from '../utils/logger';

const MAX_LIMIT = 200;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const sanitizeSearch = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toObjectId = (value: unknown) => {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  return undefined;
};

const resolveUserObjectId = (req: AuthedRequest): Types.ObjectId | undefined => {
  const raw = (req.user as { _id?: unknown; id?: unknown } | undefined)?._id ?? req.user?.id;
  return toObjectId(raw);
};

type TenantContextRequest = AuthedRequest & {
  tenantId: string;
  siteId?: string | undefined;
};

const hasTenantContext = (req: AuthedRequest): req is TenantContextRequest =>
  typeof req.tenantId === 'string' && req.tenantId.trim().length > 0;

const buildMatch = (req: TenantContextRequest): FilterQuery<AuditLogDocument> => {
  const match: FilterQuery<AuditLogDocument> = scopeQueryToTenant({}, req.tenantId, req.siteId);
  const entityTypes = toStringArray(req.query?.entityType);
  if (entityTypes.length) {
    match.entityType = entityTypes.length === 1 ? entityTypes[0] : { $in: entityTypes };
  }

  const actions = toStringArray(req.query?.action);
  if (actions.length) {
    match.action = actions.length === 1 ? actions[0] : { $in: actions };
  }

  if (typeof req.query?.entityId === 'string' && req.query.entityId.trim()) {
    match.entityId = req.query.entityId.trim();
  }

  const start = parseDate(req.query?.start);
  const end = parseDate(req.query?.end);
  const cursor = parseDate(req.query?.cursor);
  if (start || end || cursor) {
    match.ts = {};
    if (start) match.ts.$gte = start;
    if (end) match.ts.$lte = end;
    if (cursor) match.ts.$lt = cursor;
  }

  const actorSearch = typeof req.query?.actor === 'string' ? req.query.actor.trim() : undefined;
  if (actorSearch) {
    const regex = new RegExp(sanitizeSearch(actorSearch), 'i');
    match.$or = [{ 'actor.name': regex }, { 'actor.email': regex }];
  }

  const siteId = toObjectId(req.query?.siteId);
  if (siteId) {
    match.siteId = siteId;
  }

  return match;
};

const parseLimit = (value: unknown): number => {
  const parsed = Number.parseInt(typeof value === 'string' ? value : String(value ?? ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, MAX_LIMIT);
};

const formatDiff = (entries?: AuditLogDiffEntry[] | null): string => {
  if (!entries?.length) return '';
  return entries
    .map((entry) => {
      const before = entry.before === undefined ? '' : JSON.stringify(entry.before);
      const after = entry.after === undefined ? '' : JSON.stringify(entry.after);
      return `${entry.path}: ${before} → ${after}`;
    })
    .join(' | ');
};

const escapeCsv = (value: string): string => {
  if (!/[",\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
};

const toCsv = (logs: Array<Pick<AuditLogDocument, 'ts' | 'entityType' | 'entityId' | 'entity' | 'action' | 'actor' | 'diff'>>): string => {
  const header = ['timestamp', 'entity', 'action', 'actor', 'diff'];
  const rows = logs.map((log) => {
    const timestamp = log.ts instanceof Date ? log.ts.toISOString() : '';
    const entityLabel = log.entity?.label ?? '';
    const entityValue = [log.entityType, log.entityId ? `#${log.entityId}` : undefined, entityLabel ? `(${entityLabel})` : undefined]
      .filter(Boolean)
      .join(' ');
    const actorValue = log.actor?.name ?? log.actor?.email ?? '';
    const diffValue = formatDiff(log.diff);
    return [timestamp, entityValue, log.action, actorValue, diffValue];
  });
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(','))
    .join('\n');
};

const router = Router();

router.use(requireAuth);
router.use(requirePermission('audit.read'));
router.use(...withPolicyGuard({ permissions: 'audit.read' }));

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    ensureTenantContext(req as TenantScopedRequest);
    if (!hasTenantContext(req)) {
      res.status(400).json({ message: 'Tenant context is required' });
      return;
    }
    const match = buildMatch(req);
    const limit = parseLimit(req.query?.limit);
    const cursor = parseDate(req.query?.cursor);
    if (cursor) {
      if (!match.ts) match.ts = {};
      match.ts.$lt = cursor;
    }

    const logs = await AuditLog.find(match)
      .sort({ ts: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.ts?.toISOString?.() : undefined;

    res.json({ success: true, data: { items, count: items.length, nextCursor } });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req: AuthedRequest, res, next) => {
  try {
    ensureTenantContext(req as TenantScopedRequest);
    if (!hasTenantContext(req)) {
      res.status(400).json({ message: 'Tenant context is required' });
      return;
    }
    const match = buildMatch(req);
    const limit = Math.min(parseLimit(req.query?.limit), 1000);
    const logs = await AuditLog.find(match)
      .sort({ ts: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    const csv = toCsv(logs);
    const tenantObjectId = toObjectId(req.tenantId);
    const userObjectId = resolveUserObjectId(req);
    if (tenantObjectId) {
      void createNotification({
        tenantId: tenantObjectId,
        userId: userObjectId,
        category: 'updated',
        type: 'info',
        title: 'Audit export completed',
        message: `Your audit export is ready (${logs.length} record${logs.length === 1 ? '' : 's'}).`,
        event: 'audit.export.completed',
        templateContext: {
          recordCount: String(logs.length),
        },
      }).catch((err) => {
        logger.warn('Failed to emit audit export completion notification', {
          err: (err as Error).message,
          tenantId: req.tenantId,
        });
      });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateObjectId('id'), async (req: AuthedRequest, res, next) => {
  try {
    ensureTenantContext(req as TenantScopedRequest);
    if (!hasTenantContext(req)) {
      res.status(400).json({ message: 'Tenant context is required' });
      return;
    }
    const log = await AuditLog.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean().exec();
    if (!log) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

export default router;

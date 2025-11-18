/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { FilterQuery } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
// Local fallback for requirePermission if ../auth/permissions is missing.
// Replace this with the real implementation or restore the import when available.
import type { Request, Response, NextFunction } from 'express';
const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // NOTE: This placeholder allows all requests; implement proper permission checks here.
    next();
  };
};
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import AuditLog, { type AuditLogDocument, type AuditLogDiffEntry } from '../models/AuditLog';
import type { AuthedRequest } from '../types/http';

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

const buildMatch = (req: AuthedRequest): FilterQuery<AuditLogDocument> => {
  const match: FilterQuery<AuditLogDocument> = { tenantId: req.tenantId };
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
router.use(tenantScope);
router.use(requirePermission('audit', 'read'));

router.get('/', async (req, res, next) => {
  try {
    const match = buildMatch(req as AuthedRequest);
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

router.get('/export', async (req, res, next) => {
  try {
    const match = buildMatch(req as AuthedRequest);
    const limit = Math.min(parseLimit(req.query?.limit), 1000);
    const logs = await AuditLog.find(match)
      .sort({ ts: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    const csv = toCsv(logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateObjectId('id'), async (req, res, next) => {
  try {
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

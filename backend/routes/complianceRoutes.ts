/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import AuditLog from '../models/AuditLog';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

const trackedEntities = ['safety-template', 'calibration-record', 'permit'];

router.get('/metrics', async (req, res, next) => {
  try {
    const lookbackDays = Number(req.query.days ?? 30);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const logs = await AuditLog.find({
      tenantId: req.tenantId,
      ts: { $gte: since },
      entityType: { $in: trackedEntities },
    })
      .sort({ ts: -1 })
      .lean();

    const summary = trackedEntities.reduce(
      (acc, entityType) => {
        const changes = logs.filter((log) => log.entityType === entityType);
        acc[entityType] = {
          changes: changes.length,
          latestChange: changes[0]?.ts ?? null,
        };
        return acc;
      },
      {} as Record<string, { changes: number; latestChange: Date | null }>,
    );

    const overdueSafety = logs.filter((log) => log.entityType === 'safety-template' && /rejected/i.test(log.action)).length;

    res.json({
      success: true,
      data: {
        since,
        activity: summary,
        overdueSafety,
        totalChanges: logs.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const lookbackDays = Number(req.query.days ?? 90);
    const limit = Number(req.query.limit ?? 200);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const history = await AuditLog.find({
      tenantId: req.tenantId,
      ts: { $gte: since },
      entityType: { $in: trackedEntities },
    })
      .sort({ ts: -1 })
      .limit(limit)
      .lean();

    const changeHistory = history.map((item) => ({
      id: item._id?.toString(),
      when: item.ts,
      action: item.action,
      entity: item.entity,
      actor: item.actor,
      diff: item.diff,
    }));

    res.json({
      success: true,
      data: {
        windowStart: since,
        total: changeHistory.length,
        changes: changeHistory,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/audit-ready', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const history = await AuditLog.find({ tenantId: req.tenantId, entityType: { $in: trackedEntities } })
      .sort({ ts: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: history.map((entry) => ({
        id: entry._id?.toString(),
        ts: entry.ts,
        entity: entry.entity,
        action: entry.action,
        actor: entry.actor,
        before: entry.before,
        after: entry.after,
        diff: entry.diff,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

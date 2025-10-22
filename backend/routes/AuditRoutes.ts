/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import AuditLog from '../models/AuditLog';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', async (req, res, next) => {
  try {
    const match: Record<string, unknown> = { tenantId: req.tenantId };
    if (typeof req.query.entityType === 'string' && req.query.entityType.trim()) {
      match.entityType = req.query.entityType.trim();
    }
    const logs = await AuditLog.find(match).sort({ createdAt: -1 }).limit(100).lean().exec();
    res.json({ success: true, data: logs });
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

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { buildAnalyticsSnapshot } from '../services/analyticsDashboard';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/summary', async (req, res, next) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const tenantId = new Types.ObjectId(req.tenantId);
    const siteId = req.siteId && Types.ObjectId.isValid(req.siteId) ? new Types.ObjectId(req.siteId) : undefined;
    const snapshot = await buildAnalyticsSnapshot(tenantId, siteId);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

router.get('/summary.csv', async (req, res, next) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const tenantId = new Types.ObjectId(req.tenantId);
    const siteId = req.siteId && Types.ObjectId.isValid(req.siteId) ? new Types.ObjectId(req.siteId) : undefined;
    const snapshot = await buildAnalyticsSnapshot(tenantId, siteId);
    const csv = ['metric,value', ...Object.entries(snapshot).map(([k, v]) => `${k},${v}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;

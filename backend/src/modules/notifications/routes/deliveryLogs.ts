/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../../middleware/authMiddleware';
import tenantScope from '../../../../middleware/tenantScope';
import { requirePermission } from '../../../auth/permissions';
import NotificationDeliveryLog from '../../../../models/NotificationDeliveryLog';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('sites.read'), async (req, res, next) => {
  try {
    if (!req.tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const logs = await NotificationDeliveryLog.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(Number.isFinite(limit) ? limit : 50)
      .lean();
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;

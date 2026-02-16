/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../../middleware/authMiddleware';
import tenantScope from '../../../../middleware/tenantScope';
import { requirePermission } from '../../../auth/permissions';
import NotificationPreference from '../../../../models/NotificationPreference';
import type { AuthedRequest } from '../../../../types/http';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('sites.read'), async (req, res, next) => {
  try {
    const userId = typeof req.user?._id === 'string' ? req.user._id : typeof req.user?.id === 'string' ? req.user.id : undefined;
    if (!req.tenantId || !userId) {
      res.status(400).json({ error: 'Tenant/user context required' });
      return;
    }
    const preference = await NotificationPreference.findOne({ tenantId: req.tenantId, userId }).lean();
    res.json({ success: true, data: preference });
  } catch (err) {
    next(err);
  }
});

router.put('/', requirePermission('sites.read'), async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const userId = typeof authedReq.user?._id === 'string' ? authedReq.user._id : typeof authedReq.user?.id === 'string' ? authedReq.user.id : undefined;
    if (!authedReq.tenantId || !userId) {
      res.status(400).json({ error: 'Tenant/user context required' });
      return;
    }
    const body = authedReq.body as { channels?: { email?: boolean; sms?: boolean; push?: boolean }; muted?: boolean };
    const updated = await NotificationPreference.findOneAndUpdate(
      { tenantId: authedReq.tenantId, userId },
      {
        $set: {
          ...(body.channels ? { channels: body.channels } : {}),
          ...(typeof body.muted === 'boolean' ? { muted: body.muted } : {}),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
      .lean()
      .exec();
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

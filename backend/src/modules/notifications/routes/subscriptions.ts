/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../../../../middleware/authMiddleware';
import tenantScope from '../../../../middleware/tenantScope';
import { requirePermission } from '../../../auth/permissions';
import { sendResponse } from '../../../../utils';
import { subscriptionInputSchema } from '../schemas';
import {
  deleteUserSubscription,
  listUserSubscriptions,
  upsertUserSubscription,
} from '../service';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('sites.read'), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?._id;
    if (!tenantId || !userId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userObjectId = new Types.ObjectId(userId);
    const subscriptions = await listUserSubscriptions(new Types.ObjectId(tenantId), userObjectId);
    sendResponse(res, subscriptions);
  } catch (err) {
    next(err);
  }
});

router.put('/', requirePermission('sites.read'), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?._id;
    if (!tenantId || !userId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const parsed = subscriptionInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendResponse(res, null, parsed.error.flatten(), 400);
      return;
    }
    const userObjectId = new Types.ObjectId(userId);
    const subscription = await upsertUserSubscription(
      new Types.ObjectId(tenantId),
      userObjectId,
      parsed.data,
    );
    sendResponse(res, subscription, null, 200);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('sites.read'), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?._id;
    const raw = req.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;

    if (!tenantId || !userId) {
      sendResponse(res, null, 'Tenant ID required', 400);
      return;
    }
    const userObjectId = new Types.ObjectId(userId);
    await deleteUserSubscription(new Types.ObjectId(tenantId), userObjectId, id);
    sendResponse(res, { message: 'Deleted' }, null, 200);
  } catch (err) {
    next(err);
  }
});

export default router;

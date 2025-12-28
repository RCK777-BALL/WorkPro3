/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { apiKeyAuthMiddleware, requireApiKeyScope } from '../../../middleware/apiKeyAuth';
import {
  createSubscriptionHandler,
  deleteSubscriptionHandler,
  dispatchWebhookHandler,
  listSubscriptionsHandler,
} from './controller';

const router = Router();

router.get(
  '/subscriptions',
  requireAuth,
  tenantScope,
  requirePermission('integrations.manage'),
  listSubscriptionsHandler,
);
router.post(
  '/subscriptions',
  requireAuth,
  tenantScope,
  requirePermission('integrations.manage'),
  createSubscriptionHandler,
);
router.delete(
  '/subscriptions/:id',
  requireAuth,
  tenantScope,
  requirePermission('integrations.manage'),
  deleteSubscriptionHandler,
);

router.post('/events', apiKeyAuthMiddleware, requireApiKeyScope('integrations.manage'), dispatchWebhookHandler);

export default router;

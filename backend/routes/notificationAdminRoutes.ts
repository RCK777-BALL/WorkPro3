/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRoles } from '../middleware/requireRoles';
import tenantScope from '../middleware/tenantScope';
import {
  listTemplates,
  upsertTemplate,
  deleteTemplate,
  listSubscriptions,
  upsertSubscription,
  deleteSubscription,
} from '../controllers/NotificationAdminController';

const router = Router();
router.use(requireAuth);
router.use(requireRoles(['admin', 'general_manager']));
router.use(tenantScope);

router.get('/templates', listTemplates);
router.post('/templates', upsertTemplate);
router.put('/templates/:id', upsertTemplate);
router.delete('/templates/:id', deleteTemplate);

router.get('/subscriptions', listSubscriptions);
router.post('/subscriptions', upsertSubscription);
router.put('/subscriptions/:id', upsertSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

export default router;

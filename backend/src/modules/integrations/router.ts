/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import {
  createApiKeyHandler,
  listNotificationProvidersHandler,
  listApiKeysHandler,
  listApiKeyScopesHandler,
  revokeApiKeyHandler,
  sendNotificationTestHandler,
  syncCostsHandler,
  syncPurchaseOrdersHandler,
  syncVendorsHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/notifications/providers', requirePermission('sites.read'), listNotificationProvidersHandler);
router.post('/notifications/test', requirePermission('sites.manage'), sendNotificationTestHandler);
router.post('/accounting/:provider/vendors/sync', requirePermission('inventory.manage'), syncVendorsHandler);
router.post('/accounting/:provider/purchase-orders/sync', requirePermission('inventory.purchase'), syncPurchaseOrdersHandler);
router.post('/accounting/:provider/costs/sync', requirePermission('inventory.manage'), syncCostsHandler);
router.get('/api-keys/scopes', requirePermission('integrations.manage'), listApiKeyScopesHandler);
router.get('/api-keys', requirePermission('integrations.manage'), listApiKeysHandler);
router.post('/api-keys', requirePermission('integrations.manage'), createApiKeyHandler);
router.post('/api-keys/:id/revoke', requirePermission('integrations.manage'), revokeApiKeyHandler);

export default router;

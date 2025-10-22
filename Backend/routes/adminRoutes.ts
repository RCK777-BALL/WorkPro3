/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  createIntegrationKey,
  getAdminSettings,
  getAiStatus,
  getAuditLog,
  getIoTGateways,
  revokeIntegrationKey,
  trainAiModels,
  triggerBackup,
  updateAdminSetting,
} from '../controllers/AdminSettingsController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import auditTrail from '../middleware/auditTrail';
import tenantRoutes from './TenantRoutes';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/settings', getAdminSettings);
router.put('/settings/:section', auditTrail('Admin Settings', 'Update section'), updateAdminSetting);

router.post('/integrations', auditTrail('Integrations', 'Create API key'), createIntegrationKey);
router.delete('/integrations/:id', auditTrail('Integrations', 'Revoke API key'), revokeIntegrationKey);

router.get('/audit', getAuditLog);
router.post('/backup', auditTrail('Backup', 'Trigger backup'), triggerBackup);
router.get('/iot', getIoTGateways);

router.post('/ai/train', auditTrail('AI Automation', 'Train models'), trainAiModels);
router.get('/ai/status', getAiStatus);

router.use('/tenants', tenantRoutes);

export default router;


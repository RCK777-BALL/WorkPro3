/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { cloneTemplateHandler, listTemplateLibraryHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/library', requirePermission('pm', 'read'), listTemplateLibraryHandler);
router.post('/library/:templateId/clone', requirePermission('pm', 'write'), cloneTemplateHandler);

export default router;

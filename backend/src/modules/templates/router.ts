/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { cloneTemplateHandler, listInspectionFormLibraryHandler, listTemplateLibraryHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

// Expose the template library to all authenticated users so onboarding steps
// can surface curated PM templates even before roles are fully configured.
router.get('/library', listTemplateLibraryHandler);
router.get('/library/inspections', listInspectionFormLibraryHandler);
router.post('/library/:templateId/clone', requirePermission('pm', 'write'), cloneTemplateHandler);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import { createExportHandler, downloadExportHandler, listExportsHandler } from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('importExport.export'), listExportsHandler);
router.post('/', requirePermission('importExport.export'), createExportHandler);
router.get('/:id/download', requirePermission('importExport.export'), downloadExportHandler);

export default router;

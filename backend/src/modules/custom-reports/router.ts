/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requirePermission } from '../../auth/permissions';
import {
  createReportTemplateHandler,
  exportCustomReportHandler,
  getReportTemplateHandler,
  listReportTemplatesHandler,
  runCustomReportHandler,
  updateReportTemplateHandler,
} from './controller';

const router = Router();

router.post('/query', requirePermission('reports', 'read'), runCustomReportHandler);
router.post('/export', requirePermission('reports', 'export'), exportCustomReportHandler);

router.get('/templates', requirePermission('reports', 'read'), listReportTemplatesHandler);
router.post('/templates', requirePermission('reports', 'build'), createReportTemplateHandler);
router.get('/templates/:id', requirePermission('reports', 'read'), getReportTemplateHandler);
router.put('/templates/:id', requirePermission('reports', 'build'), updateReportTemplateHandler);

export default router;

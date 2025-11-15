/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import {
  listTemplatesHandler,
  upsertAssignmentHandler,
  deleteAssignmentHandler,
  listTemplateLibraryHandler,
  cloneTemplateHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/library', listTemplateLibraryHandler);
router.post('/library/:templateId/clone', cloneTemplateHandler);
router.get('/', listTemplatesHandler);
router.post('/:templateId/assignments', upsertAssignmentHandler);
router.put('/:templateId/assignments/:assignmentId', upsertAssignmentHandler);
router.delete('/:templateId/assignments/:assignmentId', deleteAssignmentHandler);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  convertRequestToWorkOrder,
  createRequest,
  listRequests,
  summarizeRequests,
  updateRequestStatus,
} from '../controllers/requests';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', listRequests);
router.get('/summary', summarizeRequests);
router.post('/', createRequest);
router.patch('/:id/status', validateObjectId('id'), updateRequestStatus);
router.post('/:id/convert', validateObjectId('id'), convertRequestToWorkOrder);

export default router;

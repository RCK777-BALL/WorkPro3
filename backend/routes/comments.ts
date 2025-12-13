/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  createAssetComment,
  createWorkOrderComment,
  listAssetComments,
  listWorkOrderComments,
} from '../controllers/comments';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/work-orders/:id', validateObjectId('id'), listWorkOrderComments);
router.post('/work-orders/:id', validateObjectId('id'), createWorkOrderComment);
router.get('/assets/:id', validateObjectId('id'), listAssetComments);
router.post('/assets/:id', validateObjectId('id'), createAssetComment);

export default router;

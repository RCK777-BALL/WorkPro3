/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  approvePermit,
  completeIsolationStep,
  createPermit,
  escalatePermit,
  getPermit,
  getPermitActivity,
  getPermitHistory,
  getSafetyKpis,
  listPermits,
  logPermitIncident,
  rejectPermit,
  updatePermit,
} from '../controllers/PermitController';
import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';

const router = Router();

router.use(requireAuth);

router.get('/kpis/safety', getSafetyKpis);
router.get('/activity', getPermitActivity);
router.get('/', listPermits);
router.post('/', createPermit);
router.get('/:id', validateObjectId('id'), getPermit);
router.put('/:id', validateObjectId('id'), updatePermit);
router.post('/:id/approve', validateObjectId('id'), approvePermit);
router.post('/:id/reject', validateObjectId('id'), rejectPermit);
router.post('/:id/escalate', validateObjectId('id'), escalatePermit);
router.post(
  '/:id/isolation/:stepIndex/complete',
  validateObjectId('id'),
  completeIsolationStep,
);
router.post('/:id/incidents', validateObjectId('id'), logPermitIncident);
router.get('/:id/history', validateObjectId('id'), getPermitHistory);

export default router;

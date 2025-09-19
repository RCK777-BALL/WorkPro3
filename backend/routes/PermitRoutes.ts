/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';
import type { UserRole } from '../types/auth';
import {
  listPermits,
  getPermit,
  createPermit,
  updatePermit,
  approvePermit,
  rejectPermit,
  escalatePermit,
  completeIsolationStep,
  logPermitIncident,
  getPermitHistory,
  getSafetyKpis,
  getPermitActivity,
} from '../controllers/PermitController';

const router = express.Router();

const ADMIN_SUPERVISOR_MANAGER: UserRole[] = ['admin', 'supervisor', 'manager'];
const APPROVER_ROLES: UserRole[] = ['admin', 'supervisor', 'manager', 'technician'];

router.use(requireAuth);

router.get('/', listPermits);
router.get('/kpis', getSafetyKpis);
router.get('/activity', getPermitActivity);
router.get('/:id/history', validateObjectId('id'), getPermitHistory);
router.get('/:id', validateObjectId('id'), getPermit);

router.post('/', requireRole(...ADMIN_SUPERVISOR_MANAGER), createPermit);
router.put(
  '/:id',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR_MANAGER),
  updatePermit,
);

router.post(
  '/:id/approve',
  validateObjectId('id'),
  requireRole(...APPROVER_ROLES),
  approvePermit,
);
router.post(
  '/:id/reject',
  validateObjectId('id'),
  requireRole(...APPROVER_ROLES),
  rejectPermit,
);
router.post(
  '/:id/escalate',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR_MANAGER),
  escalatePermit,
);
router.post(
  '/:id/isolation/:stepIndex/complete',
  validateObjectId('id'),
  requireRole(...APPROVER_ROLES),
  completeIsolationStep,
);
router.post(
  '/:id/incidents',
  validateObjectId('id'),
  requireRole(...ADMIN_SUPERVISOR_MANAGER),
  logPermitIncident,
);

export default router;

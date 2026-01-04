/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  listMaintenanceSchedules,
  getMaintenanceSchedule,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from '../controllers/MaintenanceScheduleController';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import validateObjectId from '../middleware/validateObjectId';
import { maintenanceScheduleValidators } from '../validators/maintenanceScheduleValidators';

const router = express.Router();

router.use(requireAuth);
router.get('/', listMaintenanceSchedules);
router.get('/:id', validateObjectId('id'), getMaintenanceSchedule);
router.post('/', ...maintenanceScheduleValidators, validate, createMaintenanceSchedule);
router.put(
  '/:id',
  validateObjectId('id'),
  ...maintenanceScheduleValidators,
  validate,
  updateMaintenanceSchedule,
);
router.delete('/:id', validateObjectId('id'), deleteMaintenanceSchedule);

export default router;

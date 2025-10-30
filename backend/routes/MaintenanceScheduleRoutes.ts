/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { listMaintenanceSchedules, createMaintenanceSchedule, updateMaintenanceSchedule, deleteMaintenanceSchedule } from '../controllers/MaintenanceScheduleController';
import { validate } from '../middleware/validationMiddleware';
import { maintenanceScheduleValidators, maintenanceScheduleUpdateValidators } from '../validators/maintenanceScheduleValidators';
import validateObjectId from '../middleware/validateObjectId';

const router = express.Router();

router.get('/', listMaintenanceSchedules);
router.post('/', maintenanceScheduleValidators, validate, createMaintenanceSchedule);
router.put('/:id', validateObjectId('id'), maintenanceScheduleUpdateValidators, validate, updateMaintenanceSchedule);
router.delete('/:id', validateObjectId('id'), deleteMaintenanceSchedule);

export default router;

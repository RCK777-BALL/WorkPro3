/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} from '../controllers/TenantController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import { validate } from '../middleware/validationMiddleware';
import validateObjectId from '../middleware/validateObjectId';
import { tenantValidators } from '../validators/tenantValidators';

const router = Router();

const tenantValidationHandlers = tenantValidators as unknown as RequestHandler[];

router.use(requireAuth);
router.use(requireRoles(['general_manager', 'admin']));

router.get('/', getAllTenants);
router.get('/:id', validateObjectId('id'), getTenantById);
router.post('/', ...tenantValidationHandlers, validate, createTenant);
router.put('/:id', validateObjectId('id'), ...tenantValidationHandlers, validate, updateTenant);
router.delete('/:id', validateObjectId('id'), deleteTenant);

export default router;

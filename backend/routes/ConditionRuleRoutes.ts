/*
 * SPDX-License-Identifier: MIT
 */

import express, { type RequestHandler } from 'express';
import {
  getAllConditionRules,
  getConditionRuleById,
  createConditionRule,
  updateConditionRule,
  deleteConditionRule,
} from '../controllers/ConditionRuleController';
import { requireAuth } from '../middleware/authMiddleware';
import requireRoles from '../middleware/requireRoles';
import { validate } from '../middleware/validationMiddleware';
import { conditionRuleValidators } from '../validators/conditionRuleValidators';

const router = express.Router();
const conditionRuleValidationHandlers = conditionRuleValidators as unknown as RequestHandler[];

router.use(requireAuth);
router.get('/', getAllConditionRules);
router.get('/:id', getConditionRuleById);

router.post(
  '/',
  requireRoles(['general_manager', 'assistant_general_manager', 'admin', 'supervisor']),
  ...conditionRuleValidationHandlers,
  validate,
  createConditionRule
);

router.put(
  '/:id',
  requireRoles(['general_manager', 'assistant_general_manager', 'admin', 'supervisor']),
  ...conditionRuleValidationHandlers,
  validate,
  updateConditionRule
);
router.delete(
  '/:id',
  requireRoles(['general_manager', 'assistant_general_manager', 'admin', 'supervisor']),
  deleteConditionRule,
);

export default router;

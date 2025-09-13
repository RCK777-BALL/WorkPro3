/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
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

router.use(requireAuth);
router.get('/', getAllConditionRules);
router.get('/:id', getConditionRuleById);

router.post(
  '/',
  requireRoles(['admin', 'supervisor']),
  conditionRuleValidators,
  validate,
  createConditionRule
);

router.put(
  '/:id',
  requireRoles(['admin', 'supervisor']),
  conditionRuleValidators,
  validate,
  updateConditionRule
);

router.delete('/:id', requireRoles(['admin', 'supervisor']), deleteConditionRule);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import WorkflowRule from '../models/WorkflowRule';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(requireRole('admin'));

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.get('/workflow-rules', async (req, res, next) => {
  try {
    const rules = await WorkflowRule.find({ tenantId: req.tenantId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

router.post('/workflow-rules', async (req, res, next) => {
  try {
    const payload = { ...req.body, tenantId: req.tenantId };
    const created = await WorkflowRule.create(payload);
    if (payload.isDefault) {
      await WorkflowRule.updateMany(
        { _id: { $ne: created._id }, tenantId: req.tenantId, scope: created.scope, siteId: created.siteId },
        { isDefault: false },
      );
    }
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/workflow-rules/:id', async (req, res, next) => {
  try {
    const updated = await WorkflowRule.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      req.body,
      { new: true },
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    if (updated.isDefault) {
      await WorkflowRule.updateMany(
        { _id: { $ne: updated._id }, tenantId: req.tenantId, scope: updated.scope, siteId: updated.siteId },
        { isDefault: false },
      );
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

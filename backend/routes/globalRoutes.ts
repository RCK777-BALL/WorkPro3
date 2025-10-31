/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Plant from '../models/Plant';
import Department from '../models/Department';
import Settings from '../models/Settings';
import type { AuthedRequest } from '../types/http';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    const plantFilter = tenantId ? { tenantId } : {};
    const departmentFilter = tenantId ? { tenantId } : {};
    const totalPlants = await Plant.countDocuments(plantFilter);
    const totalDepartments = await Department.countDocuments(departmentFilter);
    res.json({ totalPlants, totalDepartments });
  } catch (err) {
    next(err);
  }
});

router.post('/switch-plant', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    const { plantId } = req.body as { plantId?: string };
    if (!plantId) {
      res.status(400).json({ error: 'plantId is required' });
      return;
    }
    const plant = await Plant.findOne({ _id: plantId, tenantId });
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    const userId = (req.user?._id ?? req.user?.id) as string | undefined;
    const query: Record<string, unknown> = { tenantId };
    if (userId) {
      query.userId = userId;
    }
    const settings = await Settings.findOneAndUpdate(
      query,
      { activePlant: plant._id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({
      message: 'Active plant switched',
      activePlant: settings?.activePlant?.toString() ?? plant._id.toString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

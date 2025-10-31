/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Plant from '../models/Plant';
import type { AuthedRequest } from '../types/http';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    const filter = tenantId ? { tenantId } : {};
    const plants = await Plant.find(filter).sort({ name: 1 }).lean();
    res.json(plants.map((plant) => ({ ...plant, _id: plant._id.toString() })));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }
    const { name, location, description } = req.body as {
      name?: string;
      location?: string;
      description?: string;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Plant name is required' });
      return;
    }
    const plant = await Plant.create({
      name: name.trim(),
      location,
      description,
      tenantId,
    });
    res.status(201).json({ ...plant.toObject(), _id: plant._id.toString() });
  } catch (err) {
    next(err);
  }
});

export default router;

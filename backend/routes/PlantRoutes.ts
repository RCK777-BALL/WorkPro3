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
      location?: string | null;
      description?: string | null;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Plant name is required' });
      return;
    }
    const trimmedName = name.trim();
    const normalizedLocation =
      typeof location === 'string' ? location.trim() || undefined : undefined;
    const normalizedDescription =
      typeof description === 'string' ? description.trim() || undefined : undefined;

    const plant = await Plant.create({
      name: trimmedName,
      location: normalizedLocation,
      description: normalizedDescription,
      tenantId,
    });
    res.status(201).json({ ...plant.toObject(), _id: plant._id.toString() });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

  const { name, location, description } = req.body as {
      name?: string;
      location?: string | null;
      description?: string | null;
    };

    const setOperations: Record<string, unknown> = {};
    const unsetOperations: Record<string, 1> = {};

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        res.status(400).json({ error: 'Plant name is required' });
        return;
      }
      setOperations.name = trimmedName;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'location')) {
      if (typeof location === 'string') {
        const trimmedLocation = location.trim();
        if (trimmedLocation) {
          setOperations.location = trimmedLocation;
        } else {
          unsetOperations.location = 1;
        }
      } else if (location === null) {
        unsetOperations.location = 1;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      if (typeof description === 'string') {
        const trimmedDescription = description.trim();
        if (trimmedDescription) {
          setOperations.description = trimmedDescription;
        } else {
          unsetOperations.description = 1;
        }
      } else if (description === null) {
        unsetOperations.description = 1;
      }
    }

    if (Object.keys(setOperations).length === 0 && Object.keys(unsetOperations).length === 0) {
      res.status(400).json({ error: 'No updates provided' });
      return;
    }

    const updateOps: Record<string, Record<string, unknown>> = {};
    if (Object.keys(setOperations).length > 0) {
      updateOps.$set = setOperations;
    }
    if (Object.keys(unsetOperations).length > 0) {
      updateOps.$unset = unsetOperations;
    }

    const plant = await Plant.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      updateOps,
      { new: true },
    );

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    res.json({ ...plant.toObject(), _id: plant._id.toString() });
  } catch (err) {
    next(err);
  }
});

export default router;

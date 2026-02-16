/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import Plant from '../models/Plant';
import type { AuthedRequest } from '../types/http';

const router = Router();
router.use(requireAuth);

const listPlantsHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    const filter = tenantId ? { tenantId } : {};
    const plants = await Plant.find(filter).sort({ name: 1 }).lean();
    res.json(plants.map((plant) => ({ ...plant, _id: plant._id.toString() })));
  } catch (err) {
    next(err);
  }
};

const createPlantHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }
    const { name, location, description } = authedReq.body as {
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
};

const updatePlantHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    const { name, location, description } = authedReq.body as {
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

    if (Object.prototype.hasOwnProperty.call(authedReq.body, 'location')) {
      if (typeof location === 'string') {
        setOperations.location = location.trim();
      } else if (location === null) {
        unsetOperations.location = 1;
      }
    }

    if (Object.prototype.hasOwnProperty.call(authedReq.body, 'description')) {
      if (typeof description === 'string') {
        setOperations.description = description.trim();
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
      { _id: authedReq.params.id, tenantId },
      updateOps,
      { returnDocument: 'after' },
    );

    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    res.json({ ...plant.toObject(), _id: plant._id.toString() });
  } catch (err) {
    next(err);
  }
};

router.get('/', listPlantsHandler);
router.post('/', createPlantHandler);
router.put('/:id', updatePlantHandler);

export default router;

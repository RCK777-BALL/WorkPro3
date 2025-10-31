/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import type { FilterQuery } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import Plant, { type PlantDoc } from '../models/Plant';
import Site from '../models/Site';
import sendResponse from '../utils/sendResponse';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const filter: FilterQuery<PlantDoc> = {};
    if (req.tenantId) {
      filter.tenantId = req.tenantId as any;
    }

    let plants = await Plant.find(filter).sort({ name: 1 }).lean();

    if (plants.length === 0 && req.tenantId) {
      const sites = await Site.find({ tenantId: req.tenantId }).sort({ name: 1 }).lean();
      if (sites.length > 0) {
        const seedDocs = sites.map((site) => ({
          _id: site._id,
          name: site.name,
          tenantId: site.tenantId,
          isActive: true,
          organization: 'WorkPro CMMS Enterprise',
        }));
        if (seedDocs.length > 0) {
          await Plant.insertMany(seedDocs, { ordered: false }).catch(() => undefined);
          plants = await Plant.find(filter).sort({ name: 1 }).lean();
        }
      }
    }

    const payload = plants.map((plant) => ({
      _id: plant._id.toString(),
      name: plant.name,
      location: plant.location ?? '',
      description: plant.description ?? '',
      isActive: plant.isActive,
      organization: plant.organization,
    }));

    sendResponse(res, payload, null, 200, 'Plants retrieved');
  } catch (err) {
    next(err);
  }
});

export default router;

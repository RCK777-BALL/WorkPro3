/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { Types } from 'mongoose';

import { requireAuth } from '../middleware/authMiddleware';
import Plant from '../models/Plant';
import Department from '../models/Department';
import Settings from '../models/Settings';
import sendResponse from '../utils/sendResponse';

const router = express.Router();

router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : {};
    const [totalPlants, totalDepartments] = await Promise.all([
      Plant.countDocuments(tenantFilter),
      Department.countDocuments(tenantFilter),
    ]);

    sendResponse(res, { totalPlants, totalDepartments }, null, 200, 'Global summary retrieved');
  } catch (err) {
    next(err);
  }
});

router.post('/switch-plant', async (req, res, next) => {
  try {
    const plantId = typeof req.body?.plantId === 'string' ? req.body.plantId : '';
    if (!plantId || !Types.ObjectId.isValid(plantId)) {
      sendResponse(res, null, 'Valid plantId is required', 400);
      return;
    }

    const plant = await Plant.findOne({ _id: plantId, ...(req.tenantId ? { tenantId: req.tenantId } : {}) });
    if (!plant) {
      sendResponse(res, null, 'Plant not found', 404);
      return;
    }

    const update: { activePlant: Types.ObjectId; tenantId?: Types.ObjectId } = { activePlant: plant._id };
    if (req.tenantId && Types.ObjectId.isValid(req.tenantId)) {
      update.tenantId = new Types.ObjectId(req.tenantId);
    }
    const query = req.tenantId ? { tenantId: req.tenantId } : {};
    const settings = await Settings.findOneAndUpdate(
      query,
      update,
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    sendResponse(res, {
      message: 'Active plant switched',
      activePlant: settings?.activePlant ? settings.activePlant.toString() : plant._id.toString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;

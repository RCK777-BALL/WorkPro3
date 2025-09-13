/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import Part from '../models/Part';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

// List parts
router.get('/', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  const parts = await Part.find({ tenantId }).lean();
  res.json(parts.map(p => ({ ...p, id: p._id, quantity: p.onHand })));
});

// Get part by id
router.get('/:id', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  const part = await Part.findOne({ _id: req.params.id, tenantId }).lean();
  if (!part) return res.status(404).json({ message: 'Not found' });
  res.json({ ...part, id: part._id, quantity: part.onHand });
});

// Create part
router.post('/', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  const part = await Part.create({ ...req.body, tenantId });
  const obj = part.toObject();
  res.status(201).json({ ...obj, id: part._id, quantity: obj.onHand });
});

// Update part
router.put('/:id', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  const part = await Part.findOneAndUpdate(
    { _id: req.params.id, tenantId },
    req.body,
    { new: true }
  ).lean();
  if (!part) return res.status(404).json({ message: 'Not found' });
  res.json({ ...part, id: part._id, quantity: part.onHand });
});

// Delete part
router.delete('/:id', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  await Part.deleteOne({ _id: req.params.id, tenantId });
  res.status(204).end();
});

// Adjust part onHand
router.post('/:id/adjust', async (req, res) => {
  const tenantId = (req as any).user?.tenantId;
  const { delta, reason, woId } = req.body;
  const part = await Part.findOne({ _id: req.params.id, tenantId });
  if (!part) return res.status(404).json({ message: 'Not found' });
  part.onHand += Number(delta);
  part.adjustments.push({ delta, reason, woId, date: new Date() });
  await part.save();
  const obj = part.toObject();
  res.json({ ...obj, id: part._id, quantity: obj.onHand });
});

export default router;


/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import type { NextFunction, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import Part, { type IPart } from '../models/Part';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import { withAudit } from '../src/lib/audit';
import type { AuthedRequest } from '../types/http';

type PartRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ReqBody = Record<string, unknown>
> = AuthedRequest<P, any, ReqBody> & { auditId?: string };

interface AdjustPartPayload {
  delta: number;
  reason: string;
  woId?: string;
}

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

const loadPart = async (req: PartRequest): Promise<IPart | null> => {
  const tenantId = req.user?.tenantId;
  const id = req.auditId || req.params.id;
  if (!id) return null;
  return Part.findOne({ _id: id, tenantId }).lean<IPart>().exec();
};

const listParts = async (
  req: PartRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const parts = await Part.find({ tenantId }).lean<IPart>().exec();
    res.json(parts.map((p) => ({ ...p, id: p._id, quantity: p.onHand })));
  } catch (err) {
    next(err);
  }
};

const getPartById = async (
  req: PartRequest<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const part = await Part.findOne({ _id: req.params.id, tenantId }).lean<IPart>().exec();
    if (!part) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ ...part, id: part._id, quantity: part.onHand });
  } catch (err) {
    next(err);
  }
};

// List parts
router.get('/', listParts);

// Get part by id
router.get('/:id', getPartById);

// Create part
router.post(
  '/',
  withAudit('Part', 'create', loadPart, async (
    req: PartRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tenantId = req.user?.tenantId;
      const payload = req.body as Partial<IPart>;
      const part = await Part.create({ ...payload, tenantId });
      req.auditId = part._id;
      const obj = part.toObject();
      res.status(201).json({ ...obj, id: part._id, quantity: obj.onHand });
    } catch (err) {
      next(err);
    }
  }),
);

// Update part
router.put(
  '/:id',
  withAudit('Part', 'update', loadPart, async (
    req: PartRequest<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tenantId = req.user?.tenantId;
      const update = req.body as Partial<IPart>;
      const part = await Part.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        update,
        { new: true },
      )
        .lean<IPart>()
        .exec();
      if (!part) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      req.auditId = part._id;
      res.json({ ...part, id: part._id, quantity: part.onHand });
    } catch (err) {
      next(err);
    }
  }),
);

// Delete part
router.delete(
  '/:id',
  withAudit('Part', 'delete', loadPart, async (
    req: PartRequest<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tenantId = req.user?.tenantId;
      await Part.deleteOne({ _id: req.params.id, tenantId });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }),
);

// Adjust part onHand
router.post(
  '/:id/adjust',
  withAudit('Part', 'adjust', loadPart, async (
    req: PartRequest<{ id: string }, AdjustPartPayload>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tenantId = req.user?.tenantId;
      const { delta, reason, woId } = req.body;
      const part = await Part.findOne({ _id: req.params.id, tenantId });
      if (!part) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      part.onHand += Number(delta);
      part.adjustments.push({ delta, reason, woId, date: new Date() });
      await part.save();
      req.auditId = part._id;
      const obj = part.toObject();
      res.json({ ...obj, id: part._id, quantity: obj.onHand });
    } catch (err) {
      next(err);
    }
  }),
);

export default router;


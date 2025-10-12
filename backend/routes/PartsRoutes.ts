/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import type { NextFunction, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { LeanDocument } from 'mongoose';
import { Types } from 'mongoose';
import Part, { type IPart } from '../models/Part';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import { withAudit } from '../src/lib/audit';
import type { AuthedRequest } from '../types/http';

type PartRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ReqBody = Record<string, unknown>
> = AuthedRequest<P, any, ReqBody> & { auditId?: string };

type PartLean = LeanDocument<IPart>;

const toPartResponse = (part: PartLean | IPart) => {
  const raw = typeof (part as IPart).toObject === 'function'
    ? ((part as IPart).toObject() as PartLean)
    : (part as PartLean);
  const idSource = (part as { _id?: unknown })._id ?? raw._id;
  return {
    ...raw,
    id: String(idSource),
    quantity: raw.onHand,
  };
};

interface AdjustPartPayload {
  delta: number;
  reason: string;
  woId?: string;
}

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

const loadPart = async (req: PartRequest): Promise<PartLean | null> => {
  const tenantId = req.user?.tenantId;
  const id = req.auditId || req.params.id;
  if (!id) return null;
  return Part.findOne({ _id: id, tenantId }).lean<PartLean>().exec();
};

const listParts = async (
  req: PartRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const parts = await Part.find({ tenantId }).lean<PartLean>().exec();
    res.json(parts.map((p) => toPartResponse(p)));
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
    const part = await Part.findOne({ _id: req.params.id, tenantId }).lean<PartLean>().exec();
    if (!part) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(toPartResponse(part));
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
      req.auditId = String(part._id);
      res.status(201).json(toPartResponse(part));
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
        .lean<PartLean>()
        .exec();
      if (!part) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      req.auditId = String(part._id);
      res.json(toPartResponse(part));
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
      const adjustmentWoId = woId ? new Types.ObjectId(woId) : undefined;
      part.adjustments.push({ delta, reason, woId: adjustmentWoId, date: new Date() });
      await part.save();
      req.auditId = String(part._id);
      res.json(toPartResponse(part));
    } catch (err) {
      next(err);
    }
  }),
);

export default router;


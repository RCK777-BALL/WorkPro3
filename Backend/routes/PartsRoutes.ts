/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import type { NextFunction, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Document } from 'mongoose';
import { Types } from 'mongoose';
import Part, { type Adjustment, type IPart } from '../models/Part';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';
import { withAudit } from '../src/lib/audit';
import type { AuthedRequest } from '../types/http';

type PartRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ReqBody extends Record<string, unknown> = Record<string, unknown>,
> = AuthedRequest<P, any, ReqBody> & { auditId?: string };

type PartLean = Omit<IPart, keyof Document> & { _id: Types.ObjectId };

const getTenantId = (
  req: PartRequest,
): string | undefined => {
  if (req.tenantId) {
    return req.tenantId;
  }
  const userWithTenant = req.user as { tenantId?: string } | undefined;
  return userWithTenant?.tenantId;
};

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

interface AdjustPartPayload extends Record<string, unknown> {
  delta: number;
  reason: string;
  woId?: string;
}

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

const loadPart = async <
  P extends ParamsDictionary = ParamsDictionary,
  ReqBody extends Record<string, unknown> = Record<string, unknown>,
>(req: PartRequest<P, ReqBody>): Promise<PartLean | null> => {
  const tenantId = getTenantId(req);
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
    const tenantId = getTenantId(req);
    const parts = await Part.find({ tenantId }).lean<PartLean[]>().exec();
    res.json(parts.map((part: PartLean) => toPartResponse(part)));
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
    const tenantId = getTenantId(req);
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
      const tenantId = getTenantId(req);
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
      const tenantId = getTenantId(req);
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
      const tenantId = getTenantId(req);
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
      const tenantId = getTenantId(req);
      const { delta, reason, woId } = req.body;
      const part = await Part.findOne({ _id: req.params.id, tenantId });
      if (!part) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      part.onHand += Number(delta);
      const adjustment: Adjustment = { delta, reason, date: new Date() };
      if (woId) {
        adjustment.woId = new Types.ObjectId(woId);
      }
      part.adjustments.push(adjustment);
      await part.save();
      req.auditId = String(part._id);
      res.json(toPartResponse(part));
    } catch (err) {
      next(err);
    }
  }),
);

export default router;


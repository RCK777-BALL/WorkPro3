/*
 * SPDX-License-Identifier: MIT
 */

import { Request, Response, NextFunction } from 'express';

import Vendor from '../models/Vendor';
import { writeAuditLog } from '../utils/audit';

const allowedFields = [
  'name',
  'contactName',
  'phone',
  'email',
  'address',
  'partsSupplied',
];
const requiredFields = ['name', 'contactName'];

const validateVendorInput = (body: any) => {
  const unknownKeys = Object.keys(body).filter((k) => !allowedFields.includes(k));
  if (unknownKeys.length) {
    return { error: `Unknown fields: ${unknownKeys.join(', ')}` };
  }
  const missing = requiredFields.filter(
    (field) =>
      body[field] === undefined || body[field] === null || body[field] === ''
  );
  if (missing.length) {
    return { error: `Missing required fields: ${missing.join(', ')}` };
  }
  const data: any = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return { data };
};

 export const getAllVendors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
 
  try {
    const items = await Vendor.find();
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getVendorById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const item = await Vendor.findById(req.params.id);
    if (!item) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(item);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const createVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { data, error } = validateVendorInput(req.body);
    if (error) {
      res.status(400).json({ message: error });
      return;
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const newItem = new Vendor({ ...data, tenantId });
    const saved = await newItem.save();
    await writeAuditLog({
      tenantId,
      userId,
      action: 'create',
      entityType: 'Vendor',
      entityId: saved._id,
      after: saved.toObject(),
    });
    res.status(201).json(saved);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const updateVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const { data, error } = validateVendorInput(req.body);
    if (error) {
      res.status(400).json({ message: error });
      return;
    }
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const existing = await Vendor.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const updated = await Vendor.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    await writeAuditLog({
      tenantId,
      userId,
      action: 'update',
      entityType: 'Vendor',
      entityId: req.params.id,
      before: existing.toObject(),
      after: updated?.toObject(),
    });
    res.json(updated);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const deleteVendor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const userId = (req.user as any)?._id || (req.user as any)?.id;
    const deleted = await Vendor.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    await writeAuditLog({
      tenantId,
      userId,
      action: 'delete',
      entityType: 'Vendor',
      entityId: req.params.id,
      before: deleted.toObject(),
    });
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

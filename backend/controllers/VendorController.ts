import { Request, Response, NextFunction } from 'express';

import Vendor from '../models/Vendor';

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

export const getAllVendors = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await Vendor.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
};

export const getVendorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await Vendor.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = validateVendorInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const newItem = new Vendor(data);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = validateVendorInput(req.body);
    if (error) return res.status(400).json({ message: error });
    const updated = await Vendor.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await Vendor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

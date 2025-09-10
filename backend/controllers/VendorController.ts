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
    const newItem = new Vendor(data);
    const saved = await newItem.save();
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
    const updated = await Vendor.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
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
    const deleted = await Vendor.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json({ message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
};

import { Request, Response, NextFunction } from 'express';
import Tenant from '../models/Tenant';

export const getAllTenants = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (err) {
    next(err);
  }
};

export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Not found' });
    res.json(tenant);
  } catch (err) {
    next(err);
  }
};

export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json(tenant);
  } catch (err) {
    next(err);
  }
};

export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tenant) return res.status(404).json({ message: 'Not found' });
    res.json(tenant);
  } catch (err) {
    next(err);
  }
};

export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export default {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
};

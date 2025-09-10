import Department from '../models/Department';
import { Request, Response, NextFunction } from 'express';

export const listDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (q) filter.name = { $regex: new RegExp(q, 'i') };

    const items = await Department.find(filter).sort({ name: 1 });
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

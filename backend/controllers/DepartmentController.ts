/*
 * SPDX-License-Identifier: MIT
 */

import Department from '../models/Department';
import type { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/sendResponse';


export const listDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (q) filter.name = { $regex: new RegExp(q, 'i') };

    const items = await Department.find(filter).sort({ name: 1 });
    sendResponse(res, items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

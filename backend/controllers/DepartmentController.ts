/*
 * SPDX-License-Identifier: MIT
 */

import Department from '../models/Department';
import type { AuthedRequestHandler } from '../types/http';


export const listDepartments: AuthedRequestHandler = async (req, res, next) => {
  try {
    const filter: any = { tenantId: req.tenantId };
    if (req.siteId) filter.siteId = req.siteId;

    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    if (q) filter.name = { $regex: new RegExp(q, 'i') };

    const items = await Department.find(filter).sort({ name: 1 });
    res.json(items);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

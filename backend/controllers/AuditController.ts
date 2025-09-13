/*
 * SPDX-License-Identifier: MIT
 */

import AuditLog from '../models/AuditLog';
import type { AuthedRequestHandler } from '../types/http';

export const getRecentLogs: AuthedRequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 100);
    const logs = await AuditLog.find({ tenantId })
      .sort({ ts: -1 })
      .limit(limit)
      .lean();
    res.json(logs);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

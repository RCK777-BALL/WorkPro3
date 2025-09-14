/*
 * SPDX-License-Identifier: MIT
 */

import { FlattenMaps } from 'mongoose';
import AuditLog, { AuditLogDocument } from '../models/AuditLog';
import type { AuthedRequestHandler } from '../types/http';

export const getAuditLogs: AuthedRequestHandler = async (req: { tenantId: any; query: { limit: any; entityType: any; entityId: any; userId: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: string; }): void; new(): any; }; }; json: (arg0: (FlattenMaps<AuditLogDocument> & Required<{ _id: FlattenMaps<unknown>; }> & { __v: number; })[]) => void; }, next: (arg0: unknown) => void) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Tenant ID required' });
      return;
    }
    const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 100);
    const filter: any = { tenantId };
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) filter.entityId = req.query.entityId;
    if (req.query.userId) filter.userId = req.query.userId;

    const logs = await AuditLog.find(filter)
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

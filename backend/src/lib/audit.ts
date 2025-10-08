import type { Request, Response, NextFunction } from 'express';
import type { Types } from 'mongoose';
import AuditLog from '../../models/AuditLog';
import logger from '../../utils/logger';
import { toEntityId } from '../utils/toEntityId';

export type AuditValue = unknown;

const normalize = (v: AuditValue): AuditValue => JSON.parse(JSON.stringify(v));

export async function auditAction(
  req: Request,
  action: string,
  entityType: string,
  targetId: string | Types.ObjectId,
  before?: AuditValue,
  after?: AuditValue,
): Promise<void> {
  try {
    const tenantId = req.tenantId;
    const siteId = req.siteId;
    const userId = toEntityId((req.user as any)?._id || (req.user as any)?.id);
    if (!tenantId) return;
    await AuditLog.create({
      tenantId,
      siteId,
      userId,
      action,
      entityType,
      entityId: toEntityId(targetId),
      before: before === undefined ? undefined : normalize(before),
      after: after === undefined ? undefined : normalize(after),
      ts: new Date(),
    });
  } catch (err) {
    logger.error('audit log error', err);
  }
}

type Loader<T = any> = (req: Request) => Promise<T | null>;

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function withAudit<T = any>(
  entityType: string,
  action: string,
  load: Loader<T>,
  handler: Handler,
): Handler {
  return async (req, res, next) => {
    const before = await load(req);
    await handler(req, res, next);
    const after = await load(req);
    const id = (req as any).auditId || req.params.id || (after as any)?._id;
    if (id) {
      await auditAction(req, action, entityType, id, before ?? undefined, after ?? undefined);
    }
  };
}

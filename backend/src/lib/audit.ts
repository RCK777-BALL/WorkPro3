import type { Request, Response, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Types } from 'mongoose';
import type { ParsedQs } from 'qs';
import AuditLog from '../../models/AuditLog';
import logger from '../../utils/logger';
import { toEntityId, toObjectId } from '../../utils/ids';
import type { AuthedRequest, AuthedRequestHandler } from '../../types/http';

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

type Loader<
  T = unknown,
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
> = (req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>) => Promise<T | null>;

export function withAudit<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  T = unknown,
>(
  entityType: string,
  action: string,
  load: Loader<T, P, ResBody, ReqBody, ReqQuery>,
  handler: AuthedRequestHandler<P, ResBody, ReqBody, ReqQuery>,
): AuthedRequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    const authedReq = req as AuthedRequest<P, ResBody, ReqBody, ReqQuery> & {
      auditId?: string;
    };
    const before = await load(authedReq);
    await handler(authedReq, res as Response<ResBody>, next as NextFunction);
    const after = await load(authedReq);
    const rawId =
      authedReq.auditId ??
      (authedReq.params as { id?: string })?.id ??
      (after as { _id?: Types.ObjectId | string })?._id;
    const entityId = rawId ? toObjectId(rawId) ?? rawId : undefined;
    if (entityId) {
      await auditAction(authedReq, action, entityType, entityId, before ?? undefined, after ?? undefined);
    }
  };
}

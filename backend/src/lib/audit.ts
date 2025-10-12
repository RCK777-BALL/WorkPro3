import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { Types } from 'mongoose';
import type { ParsedQs } from 'qs';
import AuditLog from '../../models/AuditLog';
import logger from '../../utils/logger';
import { toEntityId } from '../utils/toEntityId';
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
  Locals extends Record<string, any> = Record<string, any>,
> = (req: AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals>) => Promise<T | null>;

export function withAudit<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends ParsedQs = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>,
  T = unknown,
>(
  entityType: string,
  action: string,
  load: Loader<T, P, ResBody, ReqBody, ReqQuery, Locals>,
  handler: AuthedRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req, res, next) => {
    const authedReq = req as AuthedRequest<P, ResBody, ReqBody, ReqQuery, Locals> & {
      auditId?: string;
    };
    const authedRes = res as Response<ResBody, Locals>;
    const before = await load(authedReq);
    await handler(authedReq, authedRes, next);
    const after = await load(authedReq);
    const id = (
      authedReq.auditId ??
      ((authedReq.params as unknown as { id?: string })?.id ?? (after as any)?._id)
    ) as string | Types.ObjectId | undefined;
    if (id) {
      await auditAction(authedReq, action, entityType, id, before ?? undefined, after ?? undefined);
    }
  };
}

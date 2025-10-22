/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { Types } from 'mongoose';

import AuditLog from '../models/AuditLog';
import logger from './logger';
import { toEntityId, toObjectId, type EntityIdLike } from './ids';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';

export type AuditValue = unknown;

const normalize = (value: AuditValue): AuditValue => JSON.parse(JSON.stringify(value));

export interface WriteAuditLogInput {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  userId?: EntityIdLike;
  action: string;
  entityType: string;
  entityId?: EntityIdLike;
  before?: AuditValue;
  after?: AuditValue;
  ts?: Date;
}

export async function writeAuditLog({
  tenantId,
  siteId,
  userId,
  action,
  entityType,
  entityId,
  before,
  after,
  ts,
}: WriteAuditLogInput): Promise<void> {
  const tenantObjectId = toObjectId(tenantId);
  if (!tenantObjectId) {
    logger.warn('writeAuditLog skipped: tenantId is required');
    return;
  }

  try {
    await AuditLog.create({
      tenantId: tenantObjectId,
      siteId: toObjectId(siteId) ?? undefined,
      userId: toObjectId(userId) ?? undefined,
      action,
      entityType,
      entityId: toEntityId(entityId),
      before: before === undefined ? undefined : normalize(before),
      after: after === undefined ? undefined : normalize(after),
      ts: ts ?? new Date(),
    });
  } catch (err) {
    logger.error('writeAuditLog error', err);
  }
}

export async function auditAction(
  req: Request,
  action: string,
  entityType: string,
  targetId: string | Types.ObjectId,
  before?: AuditValue,
  after?: AuditValue,
): Promise<void> {
  try {
    const authed = req as AuthedRequest & { user?: { _id?: EntityIdLike; id?: EntityIdLike } };
    const tenantId = authed.tenantId;
    if (!tenantId) return;

    const user = authed.user;
    await writeAuditLog({
      tenantId,
      siteId: authed.siteId,
      userId: user?._id ?? user?.id,
      action,
      entityType,
      entityId: targetId,
      before,
      after,
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
      auditId?: EntityIdLike;
      user?: { _id?: EntityIdLike; id?: EntityIdLike };
    };
    const authedRes = res as Parameters<AuthedRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>>[1];

    const before = await load(authedReq);
    await handler(authedReq, authedRes, next);
    const after = await load(authedReq);

    const rawId =
      authedReq.auditId ??
      ((authedReq.params as unknown as { id?: EntityIdLike })?.id ??
        ((after as any)?._id as EntityIdLike | undefined));

    await writeAuditLog({
      tenantId: authedReq.tenantId,
      siteId: authedReq.siteId,
      userId: authedReq.user?._id ?? authedReq.user?.id,
      action,
      entityType,
      entityId: rawId,
      before: before ?? undefined,
      after: after ?? undefined,
    });
  };
}

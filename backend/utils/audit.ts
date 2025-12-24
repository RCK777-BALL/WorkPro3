/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { Types } from 'mongoose';

import AuditEvent from '../models/AuditEvent';
import AuditLog, { type AuditLogDiffEntry } from '../models/AuditLog';
import logger from './logger';
import { toEntityId, toObjectId, type EntityIdLike } from './ids';
import type { AuthedRequest, AuthedRequestHandler } from '../types/http';
import { getSecurityPolicy } from '../config/securityPolicies';

export type AuditValue = unknown;
export interface AuditActor {
  id?: EntityIdLike;
  name?: string;
  email?: string;
}

const MAX_DIFF_ENTRIES = 250;

const isPlainObject = (value: AuditValue): value is Record<string, AuditValue> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalize = (value: AuditValue): AuditValue => JSON.parse(JSON.stringify(value));

const toPath = (segments: string[]): string => (segments.length > 0 ? segments.join('.') : 'root');

const buildDiffEntries = (
  before: AuditValue,
  after: AuditValue,
  segments: string[] = [],
): AuditLogDiffEntry[] => {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    return keys.flatMap((key) =>
      buildDiffEntries((before as Record<string, AuditValue>)[key], (after as Record<string, AuditValue>)[key], [...segments, key]),
    );
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    return JSON.stringify(before) === JSON.stringify(after)
      ? []
      : [{ path: toPath(segments), before, after }];
  }

  return Object.is(before, after) ? [] : [{ path: toPath(segments), before, after }];
};

const computeDiff = (
  before?: AuditValue,
  after?: AuditValue,
): AuditLogDiffEntry[] | undefined => {
  if (before === undefined || after === undefined) {
    return Object.is(before, after) ? undefined : [{ path: 'root', before, after }];
  }

  const entries = buildDiffEntries(before, after);
  if (entries.length === 0) {
    return undefined;
  }
  return entries.slice(0, MAX_DIFF_ENTRIES);
};

const pickLabel = (value?: AuditValue): string | undefined => {
  if (!isPlainObject(value)) return undefined;
  const names: unknown[] = [value.name, value.title, value.code, value.email];
  for (const candidate of names) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
};

const resolveEntityLabel = (explicit?: string, before?: AuditValue, after?: AuditValue): string | undefined =>
  explicit?.trim() || pickLabel(after) || pickLabel(before);

const normalizeActor = (actor?: AuditActor, fallbackId?: EntityIdLike) => {
  if (!actor && !fallbackId) return undefined;
  const actorId = actor?.id ?? fallbackId;
  const objectId = actorId ? toObjectId(actorId) : undefined;
  const name = actor?.name?.trim();
  const email = actor?.email?.trim();
  if (!objectId && !name && !email) return undefined;
  return {
    id: objectId ?? undefined,
    name,
    email,
  };
};

export interface WriteAuditLogInput {
  tenantId: EntityIdLike;
  siteId?: EntityIdLike;
  userId?: EntityIdLike;
  actor?: AuditActor;
  action: string;
  entityType: string;
  entityId?: EntityIdLike;
  entityLabel?: string;
  before?: AuditValue;
  after?: AuditValue;
  diff?: AuditLogDiffEntry[];
  ts?: Date;
  expiresAt?: Date;
}

export async function writeAuditLog({
  tenantId,
  siteId,
  userId,
  actor,
  action,
  entityType,
  entityId,
  entityLabel,
  before,
  after,
  diff,
  ts,
  expiresAt,
}: WriteAuditLogInput): Promise<void> {
  const tenantObjectId = toObjectId(tenantId);
  if (!tenantObjectId) {
    logger.warn('writeAuditLog skipped: tenantId is required');
    return;
  }

  try {
    const normalizedBefore = before === undefined ? undefined : normalize(before);
    const normalizedAfter = after === undefined ? undefined : normalize(after);
    const resolvedDiff = diff ?? computeDiff(normalizedBefore, normalizedAfter);
    const label = resolveEntityLabel(entityLabel, normalizedBefore, normalizedAfter);
    const actorRecord = normalizeActor(actor, userId);

    const retentionDays = getSecurityPolicy().audit.retentionDays;
    const expiration = expiresAt ?? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    await AuditLog.create({
      tenantId: tenantObjectId,
      siteId: toObjectId(siteId) ?? undefined,
      userId: toObjectId(userId ?? actor?.id) ?? undefined,
      action,
      entityType,
      entityId: toEntityId(entityId),
      entity: { type: entityType, id: toEntityId(entityId), label },
      actor: actorRecord,
      before: normalizedBefore,
      after: normalizedAfter,
      diff: resolvedDiff,
      ts: ts ?? new Date(),
      expiresAt: expiration,
    });

    await AuditEvent.create({
      tenantId: tenantObjectId,
      siteId: toObjectId(siteId) ?? undefined,
      userId: toObjectId(userId ?? actor?.id) ?? undefined,
      action,
      details: {
        entityType,
        entityId: toEntityId(entityId),
        entityLabel: label,
      },
    });
  } catch (err) {
    logger.error('writeAuditLog error', err);
  }
}

type ActorSource = {
  _id?: EntityIdLike;
  id?: EntityIdLike;
  name?: string | null;
  email?: string | null;
};

const resolveActorFromUser = (user?: ActorSource | null): AuditActor | undefined => {
  if (!user) return undefined;
  const actor: AuditActor = {};
  const id = user._id ?? user.id;
  if (id) actor.id = id;
  const name = typeof user.name === 'string' ? user.name : undefined;
  if (name?.trim()) actor.name = name.trim();
  const email = typeof user.email === 'string' ? user.email : undefined;
  if (email?.trim()) actor.email = email.trim();
  if (!actor.id && !actor.name && !actor.email) {
    return undefined;
  }
  return actor;
};

export async function auditAction(
  req: Request,
  action: string,
  entityType: string,
  targetId: string | Types.ObjectId,
  before?: AuditValue,
  after?: AuditValue,
): Promise<void> {
  try {
    const authed = req as AuthedRequest & { user?: ActorSource };
    const tenantId = authed.tenantId;
    if (!tenantId) return;

    const user = authed.user;
    const actor = resolveActorFromUser(user);
    await writeAuditLog({
      tenantId,
      siteId: authed.siteId,
      userId: user?._id ?? user?.id,
      ...(actor ? { actor } : {}),
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
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    const authedReq = req as AuthedRequest<P, ResBody, ReqBody, ReqQuery> & {
      auditId?: EntityIdLike;
      user?: ActorSource;
    };
    const authedRes = res as Parameters<AuthedRequestHandler<P, ResBody, ReqBody, ReqQuery>>[1];

    const before = await load(authedReq);
    await handler(authedReq, authedRes, next);
    const after = await load(authedReq);

    const rawId =
      authedReq.auditId ??
      ((authedReq.params as unknown as { id?: EntityIdLike })?.id ??
        ((after as any)?._id as EntityIdLike | undefined));

    const actor = resolveActorFromUser(authedReq.user);
    await writeAuditLog({
      tenantId: authedReq.tenantId,
      siteId: authedReq.siteId,
      userId: authedReq.user?._id ?? authedReq.user?.id,
      ...(actor ? { actor } : {}),
      action,
      entityType,
      entityId: rawId,
      before: before ?? undefined,
      after: after ?? undefined,
    });
  };
}

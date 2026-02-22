/*
 * SPDX-License-Identifier: MIT
 */

import type { RequestHandler } from 'express';

import type { AuthedRequest } from '../../../types/http';
import { writeAuditLog, type AuditActor } from '../../../utils/audit';
import { toEntityId } from '../../../utils/ids';

const buildActor = (req: AuthedRequest): AuditActor | undefined => {
  const user = req.user as { _id?: string; id?: string; email?: string; name?: string } | undefined;
  if (!user) return undefined;
  const id = user._id ?? user.id;
  const email = user.email ?? undefined;
  const name = user.name ?? undefined;
  if (!id && !email && !name) return undefined;
  return { id, email, name };
};

const resolveEntityId = (req: AuthedRequest, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = (req.params as Record<string, unknown> | undefined)?.[key];
    const entityIdRaw = toEntityId(value as string | undefined);
    const entityId = Array.isArray(entityIdRaw) ? entityIdRaw[0] : entityIdRaw;

    if (entityId) return entityId;
  }
  return undefined;
};

export interface DataAccessAuditOptions {
  action?: string;
  entityIdParams?: string[];
}

export const auditDataAccess = (
  entityType: string,
  options: DataAccessAuditOptions = {},
): RequestHandler => (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    if (!['GET', 'HEAD'].includes(req.method)) return;

    const authed = req as AuthedRequest;
    if (!authed.tenantId) return;

    const entityId = resolveEntityId(authed, options.entityIdParams ?? ['id']);
    const actor = buildActor(authed);

    await writeAuditLog({
      tenantId: authed.tenantId,
      siteId: authed.siteId,
      userId: actor?.id ?? undefined,
      ...(actor ? { actor } : {}),
      action: options.action ?? 'data_access',
      entityType,
      entityId,
      after: {
        method: req.method,
        path: req.originalUrl,
      },
    });
  });

  next();
};

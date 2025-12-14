/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request } from 'express';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import scimAuth from '../middleware/scimAuth';
import User, { type UserDocument } from '../models/User';
import { writeAuditLog } from '../utils/audit';
import logger from '../utils/logger';
import { getSecurityPolicy } from '../config/securityPolicies';
import { ROLES, type UserRole } from '../types/auth';

type TenantRequest = Request & { tenantId?: string };

const router = Router();

router.use(scimAuth);

const SECURITY_POLICY = getSecurityPolicy();

const buildListResponse = () => ({
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  totalResults: 0,
  startIndex: 1,
  itemsPerPage: 0,
  Resources: [],
});

const buildMeta = (resourceType: 'User' | 'Group', tenantId: string | undefined, id: string) => {
  const timestamp = new Date().toISOString();
  return {
    resourceType,
    tenantId,
    location: `/api/scim/v2/${resourceType === 'User' ? 'Users' : 'Groups'}/${id}`,
    created: timestamp,
    lastModified: timestamp,
  };
};

router.get('/Users', (_req, res) => {
  res.json(buildListResponse());
});

router.get('/Groups', (_req, res) => {
  res.json(buildListResponse());
});

const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : undefined;
};

const resolveEmailFromScim = (body: Record<string, unknown>): string | undefined => {
  const direct = normalizeEmail(body.userName);
  if (direct) return direct;
  const emails = body.emails as Array<{ value?: string }> | undefined;
  const primary = emails?.find((item) => item?.value)?.value;
  return normalizeEmail(primary);
};

const normalizeRoles = (value: unknown): UserRole[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : typeof entry === 'object' && entry
            ? (entry as { value?: unknown }).value
            : undefined,
      )
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry): entry is UserRole => (ROLES as readonly string[]).includes(entry));
  }
  return [];
};

const provisionUserFromScim = async (tenantId: string, payload: Record<string, any>) => {
  if (!Types.ObjectId.isValid(tenantId)) {
    throw new Error('Invalid tenant id');
  }

  const tenantObjectId = new Types.ObjectId(tenantId);

  const email = resolveEmailFromScim(payload);
  if (!email) {
    throw new Error('SCIM user email is required');
  }

  const displayName =
    typeof payload.displayName === 'string'
      ? payload.displayName
      : typeof payload.name?.formatted === 'string'
        ? payload.name.formatted
        : email.split('@')[0];
  const employeeId = typeof payload.externalId === 'string' && payload.externalId.trim()
    ? payload.externalId.trim()
    : payload.id ?? randomUUID();
  const roles = normalizeRoles(payload.roles ?? payload.groups);
  const resolvedRoles: UserRole[] = roles.length ? roles : ['tech'];

  let user = await User.findOne({ email: email.toLowerCase(), tenantId: tenantObjectId }).select(
    '+passwordHash +tenantId +siteId +roles +role +name +employeeId',
  );

  const userPayload = {
    name: displayName,
    email,
    employeeId,
    tenantId: tenantObjectId,
    roles: resolvedRoles,
    siteId: payload.siteId ?? undefined,
    passwordHash: randomUUID(),
    bootstrapAccount: true,
    passwordExpired: true,
    mfaEnabled: SECURITY_POLICY.mfa.enforced,
  } satisfies Partial<UserDocument>;

  const action = user ? 'updated' : 'created';
  if (!user) {
    user = new User(userPayload);
  } else {
    Object.assign(user, userPayload);
  }

  await user.save();

  await writeAuditLog({
    tenantId,
    userId: user._id,
    action: `scim_user_${action}`,
    entityType: 'user',
    entityId: user._id.toString(),
    after: {
      email: user.email,
      name: user.name,
      roles: user.roles,
      employeeId: user.employeeId,
      mfaEnabled: user.mfaEnabled,
    },
  });

  return { user, action } as const;
};

router.post('/Users', async (req, res, next) => {
  try {
    const tenantId = (req as TenantRequest).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Missing tenant identifier' });
      return;
    }

    const { user, action } = await provisionUserFromScim(tenantId, req.body ?? {});
    const id = user._id.toString();
    const meta = buildMeta('User', tenantId, id);
    res.status(action === 'created' ? 201 : 200).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id,
      userName: user.email,
      name: { formatted: user.name },
      active: req.body?.active ?? true,
      roles: user.roles,
      emails: [{ value: user.email, primary: true }],
      externalId: user.employeeId,
      meta,
    });
  } catch (err) {
    logger.error('SCIM user provisioning failed', err);
    next(err);
  }
});

router.patch('/Users/:id', async (req, res, next) => {
  try {
    const tenantId = (req as TenantRequest).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Missing tenant identifier' });
      return;
    }

    const user = await User.findOne({ _id: req.params.id, tenantId }).select(
      '+tenantId +roles +role +email +name +employeeId +active',
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updatedRoles = normalizeRoles(req.body?.roles ?? req.body?.groups);
    if (updatedRoles.length) {
      user.roles = updatedRoles;
    }
    const email = resolveEmailFromScim(req.body ?? {});
    if (email) {
      user.email = email;
    }
    if (typeof req.body?.displayName === 'string') {
      user.name = req.body.displayName;
    }
    if (typeof req.body?.active === 'boolean') {
      user.active = req.body.active;
      if (!req.body.active) {
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      }
    }

    await user.save();

    await writeAuditLog({
      tenantId,
      userId: user._id,
      action: 'scim_user_updated',
      entityType: 'user',
      entityId: user._id.toString(),
      after: {
        email: user.email,
        roles: user.roles,
        active: user.active,
      },
    });

    res.json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user._id.toString(),
      userName: user.email,
      name: { formatted: user.name },
      active: user.active,
      roles: user.roles,
      emails: [{ value: user.email, primary: true }],
      externalId: user.employeeId,
      meta: buildMeta('User', tenantId, user._id.toString()),
    });
  } catch (err) {
    logger.error('SCIM user update failed', err);
    next(err);
  }
});

router.delete('/Users/:id', async (req, res, next) => {
  try {
    const tenantId = (req as TenantRequest).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Missing tenant identifier' });
      return;
    }

    const user = await User.findOne({ _id: req.params.id, tenantId }).select('+tokenVersion +active');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.active = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    await writeAuditLog({
      tenantId,
      userId: user._id,
      action: 'scim_user_deactivated',
      entityType: 'user',
      entityId: user._id.toString(),
      after: { active: user.active },
    });

    res.status(204).send();
  } catch (err) {
    logger.error('SCIM user deactivation failed', err);
    next(err);
  }
});

router.post('/Groups', async (req, res, next) => {
  try {
    const tenantId = (req as TenantRequest).tenantId;
    if (!tenantId) {
      res.status(400).json({ message: 'Missing tenant identifier' });
      return;
    }
    const id = req.body?.id ?? randomUUID();
    const meta = buildMeta('Group', tenantId, id);

    await writeAuditLog({
      tenantId,
      action: 'scim_group_placeholder',
      entityType: 'group',
      entityId: id,
      after: req.body,
    });

    res.status(201).json({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id,
      ...req.body,
      meta,
    });
  } catch (err) {
    logger.error('SCIM group provisioning failed', err);
    next(err);
  }
});

export default router;

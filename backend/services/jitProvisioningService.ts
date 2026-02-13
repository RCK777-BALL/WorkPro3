/*
 * SPDX-License-Identifier: MIT
 */

import { randomUUID } from 'crypto';
import { Types } from 'mongoose';

import { getSecurityPolicy } from '../config/securityPolicies';
import User, { type UserDocument, type UserRole } from '../models/User';
import { ROLES } from '../types/auth';
import { writeAuditLog } from '../utils/audit';

const policy = getSecurityPolicy();

const normalizeRoles = (roles?: unknown): UserRole[] => {
  if (!roles) return [];
  const rawList = Array.isArray(roles) ? roles : [roles];
  const normalized = rawList
    .filter((role): role is string => typeof role === 'string')
    .map((role) => role.trim().toLowerCase())
    .filter((role): role is UserRole => (ROLES as readonly string[]).includes(role));

  return normalized.length ? normalized : ['tech'];
};

export interface ProvisioningInput {
  tenantId: string;
  email: string;
  name?: string;
  roles?: string[];
  siteId?: string;
  employeeId?: string;
  skipMfa?: boolean;
}

export interface ProvisioningResult {
  user: UserDocument;
  created: boolean;
}

export const provisionUserFromIdentity = async (
  input: ProvisioningInput,
  { force }: { force?: boolean } = {},
): Promise<ProvisioningResult> => {
  if (!Types.ObjectId.isValid(input.tenantId)) {
    throw new Error('Invalid tenant id');
  }

  const tenantObjectId = new Types.ObjectId(input.tenantId);
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail, tenantId: tenantObjectId }).select(
    '+passwordHash +tenantId +siteId +roles +role +mfaEnabled +tokenVersion +active',
  );

  if (!policy.provisioning.jitProvisioningEnabled && !force && !existingUser) {
    throw new Error('Just-in-time provisioning is disabled');
  }

  const userPayload: Partial<UserDocument> = {
    name: input.name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    tenantId: tenantObjectId,
    siteId: input.siteId && Types.ObjectId.isValid(input.siteId) ? new Types.ObjectId(input.siteId) : undefined,
    employeeId: input.employeeId || `jit-${randomUUID()}`,
    roles: normalizeRoles(input.roles),
    passwordHash: randomUUID(),
    passwordExpired: true,
    bootstrapAccount: true,
    mfaEnabled: policy.mfa.enforced && !input.skipMfa,
    active: true,
  };

  let created = false;
  if (!existingUser) {
    const user = new User(userPayload);
    await user.save();
    await writeAuditLog({
      tenantId: input.tenantId,
      userId: user._id,
      action: 'jit_user_created',
      entityType: 'user',
      entityId: user._id.toString(),
      after: { email: user.email, roles: user.roles },
    });
    return { user, created: true };
  }

  Object.assign(existingUser, userPayload, { active: true });
  existingUser.tokenVersion = (existingUser.tokenVersion ?? 0) + 1;
  await existingUser.save();

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: existingUser._id,
    action: 'jit_user_refreshed',
    entityType: 'user',
    entityId: existingUser._id.toString(),
    after: { email: existingUser.email, roles: existingUser.roles },
  });

  return { user: existingUser, created };
};

export default { provisionUserFromIdentity };

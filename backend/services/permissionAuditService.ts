/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import PermissionChangeLog, { type PermissionChangeActor } from '../models/PermissionChangeLog';

export interface PermissionChangeInput {
  tenantId: Types.ObjectId;
  siteId?: Types.ObjectId | null;
  departmentId?: Types.ObjectId | null;
  roleId?: Types.ObjectId | null;
  roleName?: string | null;
  before?: string[] | null;
  after?: string[] | null;
  actor?: PermissionChangeActor | null;
}

const toSet = (values?: string[] | null): Set<string> => new Set((values ?? []).map((value) => value.toLowerCase()));

export const recordPermissionChange = async (change: PermissionChangeInput): Promise<void> => {
  const before = toSet(change.before);
  const after = toSet(change.after);

  const added: string[] = [];
  const removed: string[] = [];

  after.forEach((value) => {
    if (!before.has(value)) added.push(value);
  });

  before.forEach((value) => {
    if (!after.has(value)) removed.push(value);
  });

  await PermissionChangeLog.create({
    tenantId: change.tenantId,
    siteId: change.siteId ?? null,
    departmentId: change.departmentId ?? null,
    roleId: change.roleId,
    roleName: change.roleName,
    actor: change.actor,
    before: change.before,
    after: change.after,
    delta: { added, removed },
  });
};

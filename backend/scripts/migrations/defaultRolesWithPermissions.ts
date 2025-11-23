/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Role from '../../models/Role';
import User from '../../models/User';
import UserRoleAssignment from '../../models/UserRoleAssignment';
import logger from '../../utils/logger';
import { ALL_PERMISSIONS, PERMISSIONS } from '../../../shared/types/permissions';

dotenv.config();

const roleDefinitions: Array<{ name: string; permissions: string[] }> = [
  { name: 'global_admin', permissions: ['*'] },
  { name: 'plant_admin', permissions: ['*'] },
  { name: 'admin', permissions: ALL_PERMISSIONS },
  {
    name: 'supervisor',
    permissions: [
      PERMISSIONS.workRequests.read,
      PERMISSIONS.workRequests.convert,
      PERMISSIONS.hierarchy.read,
      PERMISSIONS.hierarchy.write,
      PERMISSIONS.inventory.read,
      PERMISSIONS.inventory.manage,
      PERMISSIONS.pm.read,
      PERMISSIONS.pm.write,
      PERMISSIONS.executive.read,
    ],
  },
  {
    name: 'planner',
    permissions: [
      PERMISSIONS.workRequests.read,
      PERMISSIONS.hierarchy.read,
      PERMISSIONS.inventory.read,
      PERMISSIONS.pm.read,
      PERMISSIONS.pm.write,
    ],
  },
  {
    name: 'tech',
    permissions: [
      PERMISSIONS.workRequests.read,
      PERMISSIONS.hierarchy.read,
      PERMISSIONS.inventory.read,
      PERMISSIONS.pm.read,
    ],
  },
  {
    name: 'viewer',
    permissions: [
      PERMISSIONS.workRequests.read,
      PERMISSIONS.hierarchy.read,
      PERMISSIONS.inventory.read,
      PERMISSIONS.audit.read,
    ],
  },
];

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
  throw new Error('MONGO_URI or DATABASE_URL must be defined to run migration');
}

async function upsertRoles() {
  for (const definition of roleDefinitions) {
    await Role.findOneAndUpdate(
      { name: definition.name },
      { $set: { permissions: definition.permissions } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
}

async function backfillAssignments() {
  const roles = await Role.find({ name: { $in: roleDefinitions.map((r) => r.name) } })
    .select('_id name')
    .lean();

  const roleMap = new Map<string, mongoose.Types.ObjectId>();
  roles.forEach((role) => {
    if (role.name && role._id) {
      roleMap.set(role.name, new mongoose.Types.ObjectId(role._id));
    }
  });

  const users = await User.find({ roles: { $exists: true, $not: { $size: 0 } } })
    .select('_id roles tenantId siteId')
    .lean();

  for (const user of users) {
    const tenantId = user.tenantId instanceof mongoose.Types.ObjectId
      ? user.tenantId
      : new mongoose.Types.ObjectId(user.tenantId);

    for (const roleName of user.roles ?? []) {
      const roleId = roleMap.get(roleName);
      if (!roleId) continue;

      await UserRoleAssignment.updateOne(
        {
          userId: user._id,
          roleId,
          tenantId,
          siteId: user.siteId ?? null,
        },
        {},
        { upsert: true },
      );
    }
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  logger.info('Connected to MongoDB for default role migration');

  await upsertRoles();
  logger.info('Default roles ensured');

  await backfillAssignments();
  logger.info('Existing users backfilled with role assignments');

  await mongoose.disconnect();
  logger.info('Migration complete');
}

run().catch((error) => {
  logger.error('Failed to run defaultRolesWithPermissions migration', error);
  void mongoose.disconnect();
  process.exit(1);
});

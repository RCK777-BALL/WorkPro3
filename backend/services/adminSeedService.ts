/*
 * SPDX-License-Identifier: MIT
 */

import Tenant from '../models/Tenant';
import User from '../models/User';
import logger from '../utils/logger';

export async function ensureSeedAdminUser(): Promise<void> {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME?.trim() || 'Admin';

  if (!email || !password) {
    return;
  }

  const existingAdmin = await User.findOne({ roles: { $in: ['admin'] } });
  if (existingAdmin) {
    return;
  }

  let tenant = await Tenant.findOne().sort({ createdAt: 1 });
  if (!tenant) {
    tenant = await Tenant.create({ name: 'Default Tenant' });
  }

  await User.create({
    tenantId: tenant._id,
    name,
    email,
    passwordHash: password,
    employeeId: 'ADMIN-SEED-001',
    employeeNumber: 'ADMIN-SEED-001',
    roles: ['admin'],
    active: true,
    isActive: true,
    status: 'active',
    mustChangePassword: false,
  });

  logger.info('Seeded initial admin user from environment variables', { email });
}

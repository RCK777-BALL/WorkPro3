/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import User from '../models/User';
import Tenant from '../models/Tenant';
import logger from '../utils/logger';

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

if (!process.env.MONGO_URI) {
  logger.error('❌ MONGO_URI not defined in .env');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.BOOTSTRAP_ADMIN_NAME || 'Bootstrap Admin';
const DEFAULT_TENANT_NAME = 'Default Tenant';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  logger.error('❌ BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required.');
  process.exit(1);
}

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info('✅ Connected to MongoDB');

    const tenant = await Tenant.findOneAndUpdate(
      { name: DEFAULT_TENANT_NAME },
      { name: DEFAULT_TENANT_NAME },
      { returnDocument: 'after', upsert: true }
    );

    if (!tenant) {
      throw new Error('Failed to create or retrieve default tenant');
    }

    let user = await User.findOne({ email: ADMIN_EMAIL });
    if (!user) {
      user = new User({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash: ADMIN_PASSWORD,
        roles: ['global_admin'],
        tenantId: tenant._id,
        employeeId: randomUUID(),
        passwordExpired: true,
        bootstrapAccount: true,
        mfaEnabled: false,
      });
      await user.save();
      logger.info(`✅ Admin account created: ${ADMIN_EMAIL}`);
    } else {
      user.name = ADMIN_NAME;
      user.roles = ['global_admin'];
      user.tenantId = tenant._id;
      user.passwordHash = ADMIN_PASSWORD;
      user.passwordExpired = true;
      user.bootstrapAccount = true;
      user.mfaEnabled = false;
      if (!user.employeeId) {
        user.employeeId = randomUUID();
      }
      await user.save();
      logger.info(`ℹ️  Admin account refreshed: ${ADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();

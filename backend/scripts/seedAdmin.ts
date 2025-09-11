/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Tenant from "../models/Tenant";
import logger from "../utils/logger";

const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

if (!process.env.MONGO_URI) {
  logger.error("❌ MONGO_URI not defined in .env");
  process.exit(1);
}

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info("✅ Connected to MongoDB");

    const tenant = await Tenant.findOneAndUpdate(
      { name: 'Default Tenant' },
      { name: 'Default Tenant' },
      { new: true, upsert: true }
    );

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
        tenantId: tenant._id,
      },
      { new: true, upsert: true }
    );

    logger.info('✅ Admin account seeded');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();

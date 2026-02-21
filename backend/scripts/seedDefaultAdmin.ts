/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { ensureSeedAdminUser } from '../services/adminSeedService';

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
    if (!mongoUri) {
      logger.error('Database connection string missing. Set MONGO_URI or DATABASE_URL.');
      return;
    }
    await mongoose.connect(mongoUri);
    await ensureSeedAdminUser();
    logger.info('Seed admin script complete');
  } catch (err) {
    logger.error('Error seeding default admin:', err);
  } finally {
    await mongoose.connection.close();
  }
};

void seed();

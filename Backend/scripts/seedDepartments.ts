import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import Department from '../models/Department';

// Load environment variables from backend/.env if present
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const { MONGO_URI, SEED_TENANT_ID, SEED_SITE_ID } = process.env;

if (!MONGO_URI || !SEED_TENANT_ID) {
  console.error('❌ MONGO_URI and SEED_TENANT_ID must be defined');
  process.exit(1);
}

async function seedDepartments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const tenantId = new mongoose.Types.ObjectId(SEED_TENANT_ID);
    const siteId = SEED_SITE_ID ? new mongoose.Types.ObjectId(SEED_SITE_ID) : undefined;

    const base = { tenantId } as any;
    if (siteId) base.siteId = siteId;

    const names = ['Production', 'Maintenance', 'Quality'];

    for (const name of names) {
      await Department.findOneAndUpdate(
        { name, ...base },
        { name, ...base },
        { upsert: true, new: true }
      );
      console.log(`✅ Department seeded: ${name}`);
    }

    await mongoose.disconnect();
    console.log('🌱 Department seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding departments:', err);
    process.exit(1);
  }
}

seedDepartments();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Tenant from '../models/Tenant';

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
      console.error(
        'Database connection string missing. Create backend/.env or set MONGO_URI or DATABASE_URL.'
      );
      return;
    }
    await mongoose.connect(mongoUri);
    const count = await User.countDocuments();

    if (count === 0) {
      const tenant = await Tenant.create({ name: 'Default Tenant' });
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        tenantId: tenant._id,
      });
      console.log('✅ Default admin user seeded', {
        email: 'admin@example.com',
        tenant: tenant.name,
      });
    } else {
      console.log('ℹ️ Users already exist. Skipping.');
    }
  } catch (err) {
    console.error('❌ Error seeding default admin:', err);
  } finally {
    mongoose.connection.close();
  }
};

seed();

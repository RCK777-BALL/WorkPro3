import mongoose, { Types } from 'mongoose';
import Department from '../models/Department';

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro3';
  const tenantId = process.env.SEED_TENANT_ID ? new Types.ObjectId(process.env.SEED_TENANT_ID) : undefined;
  const siteId = process.env.SEED_SITE_ID ? new Types.ObjectId(process.env.SEED_SITE_ID) : undefined;

  if (!tenantId) {
    console.error('SEED_TENANT_ID is required. Example: set SEED_TENANT_ID=64c2... (an ObjectId)');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  await Department.deleteMany({ tenantId });

  await Department.insertMany([
    { name: 'Operations', description: 'Ops & facilities', tenantId, siteId },
    { name: 'Maintenance', description: 'Repairs & PM', tenantId, siteId },
    { name: 'IT', description: 'Systems & support', tenantId, siteId },
  ]);

  console.log('Seeded departments for tenant', tenantId.toString());
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });

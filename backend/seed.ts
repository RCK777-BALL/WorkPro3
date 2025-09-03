import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}


import User from './models/User';
import Department from './models/Department';
import Asset from './models/Asset';
import PMTask from './models/PMTask';
import WorkOrder from './models/WorkOrder';
import Notification from './models/Notification';
import Tenant from './models/Tenant';

// Tenant id used for all seeded records
const tenantId = process.env.SEED_TENANT_ID
  ? new mongoose.Types.ObjectId(process.env.SEED_TENANT_ID)
  : new mongoose.Types.ObjectId();

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error(
    'Database connection string missing. Create backend/.env or set MONGO_URI or DATABASE_URL.'
  );
  process.exit(1);
}

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Department.deleteMany({});
  await Asset.deleteMany({});
  await PMTask.deleteMany({});
  await WorkOrder.deleteMany({});
  await Notification.deleteMany({});
  await Tenant.deleteMany({});

  // Seed Tenant
  await Tenant.create({ _id: tenantId, name: 'Default Tenant' });

  // Seed Users
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    tenantId,
    employeeId: 'ADM001',
  });
  const tech = await User.create({
    name: 'Tech',
    email: 'tech@example.com',
    password: 'tech123',
    role: 'technician',
    tenantId,
    employeeId: 'TECH001',
  });

  // Additional employee hierarchy
  const departmentLeader = await User.create({
    name: 'Department Leader',
    email: 'department.leader@example.com',
    password: 'leader123',
    role: 'manager',
    employeeId: 'DL001',
    tenantId,
    managerId: admin._id,
  });

  const areaLeader = await User.create({
    name: 'Area Leader',
    email: 'area.leader@example.com',
    password: 'area123',
    role: 'manager',
    employeeId: 'AL001',
    tenantId,
    managerId: departmentLeader._id,
  });

  const teamLeader = await User.create({
    name: 'Team Leader',
    email: 'team.leader@example.com',
    password: 'team123',
    role: 'manager',
    employeeId: 'TL001',
    tenantId,
    managerId: areaLeader._id,
  });

  await User.insertMany([
    {
      name: 'Team Member One',
      email: 'member.one@example.com',
      password: 'member123',
      role: 'technician',
      employeeId: 'TM001',
      tenantId,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Two',
      email: 'member.two@example.com',
      password: 'member123',
      role: 'technician',
      employeeId: 'TM002',
      tenantId,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Three',
      email: 'member.three@example.com',
      password: 'member123',
      role: 'technician',
      employeeId: 'TM003',
      tenantId,
      managerId: teamLeader._id,
    },
  ]);

  // Seed Department hierarchy
  const dept = await Department.create({ name: 'Production', lines: [] });

  const line = { name: 'Line A', stations: [] } as any;
  line.stations.push({ name: 'Station 1' });
  dept.lines.push(line);
  await dept.save();

  const lineId = dept.lines[0]._id;
  const stationId = dept.lines[0].stations[0]._id;

  // Seed Asset
  const assetData = {
    name: 'Conveyor Belt',
    type: 'Mechanical',
    location: 'Line A - Station 1',
    departmentId: dept._id,
    lineId,
    stationId,
    status: 'Active',
    description: 'Main conveyor belt for packaging line',
    tenantId,
  };

  const asset = await Asset.create(assetData);

  // Also store the asset reference inside the station hierarchy
  dept.lines[0].stations[0].assets.push(asset._id);
  await dept.save();

  // Seed PM Task
  const pmTask = await PMTask.create({
    title: 'Monthly Lubrication',
    asset: asset._id,
    frequency: 'monthly',
    lastRun: new Date(),
    nextDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    notes: 'Check oil level and apply grease.',
    tenantId,
  });

  // Seed Work Order
  await WorkOrder.create({
    title: 'Initial Maintenance',
    asset: asset._id,
    description: 'Setup inspection',
    priority: 'medium',
    status: 'open',
    assignedTo: tech._id,
    teamMemberName: 'Tech',
    line: lineId,
    station: stationId,
    department: dept._id,
    importance: 'low',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    tenantId,
  });

  // Seed Notifications
  await Notification.insertMany([
    {
      tenantId,
      message: 'Critical system failure on Line A',
      type: 'critical',
    },
    {
      tenantId,
      message: 'Pending maintenance due this week',
      type: 'warning',
    },
    {
      tenantId,
      message: 'System check completed successfully',
      type: 'info',
    },
  ]);

  console.log('✅ Seed data inserted successfully');
  process.exit();
}).catch((err: unknown) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});

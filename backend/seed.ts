/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger';

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
import Notification from './models/Notifications';
import Tenant from './models/Tenant';
import AuditLog from './models/AuditLog';
import Site from './models/Site';
import SensorReading from './models/SensorReading';
import ProductionRecord from './models/ProductionRecord';

// Tenant id used for all seeded records
const tenantId = process.env.SEED_TENANT_ID
  ? new mongoose.Types.ObjectId(process.env.SEED_TENANT_ID)
  : new mongoose.Types.ObjectId();

const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  logger.error(
    'Database connection string missing. Create backend/.env or set MONGO_URI or DATABASE_URL.'
  );
  process.exit(1);
}

mongoose.connect(mongoUri).then(async () => {
  logger.info('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Department.deleteMany({});
  await Asset.deleteMany({});
  await Site.deleteMany({});
  await PMTask.deleteMany({});
  await WorkOrder.deleteMany({});
  await ProductionRecord.deleteMany({});
  await SensorReading.deleteMany({});
  await Notification.deleteMany({});
  await Tenant.deleteMany({});
  await AuditLog.deleteMany({});

  // Seed Tenant
  await Tenant.create({ _id: tenantId, name: 'Default Tenant' });

  // Seed Site for analytics
  const mainSite = await Site.create({ name: 'Main Plant', tenantId });

  // Seed Users
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'admin123',
    roles: ['admin'],
    tenantId,
    employeeId: 'ADM001',
  });
  const tech = await User.create({
    name: 'Tech',
    email: 'tech@example.com',
    passwordHash: 'tech123',
    roles: ['tech'],
    tenantId,
    employeeId: 'TECH001',
  });

  // Additional employee hierarchy
  const departmentLeader = await User.create({
    name: 'Department Leader',
    email: 'department.leader@example.com',
    passwordHash: 'leader123',
    roles: ['supervisor'],
    employeeId: 'DL001',
    tenantId,
    managerId: admin._id,
  });

  const areaLeader = await User.create({
    name: 'Area Leader',
    email: 'area.leader@example.com',
    passwordHash: 'area123',
    roles: ['supervisor'],
    employeeId: 'AL001',
    tenantId,
    managerId: departmentLeader._id,
  });

  const teamLeader = await User.create({
    name: 'Team Leader',
    email: 'team.leader@example.com',
    passwordHash: 'team123',
    roles: ['supervisor'],
    employeeId: 'TL001',
    tenantId,
    managerId: areaLeader._id,
  });

  await User.insertMany([
    {
      name: 'Team Member One',
      email: 'member.one@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
      employeeId: 'TM001',
      tenantId,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Two',
      email: 'member.two@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
      employeeId: 'TM002',
      tenantId,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Three',
      email: 'member.three@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
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
    siteId: mainSite._id,
  };

  const asset = await Asset.create(assetData);

  // Also store the asset reference inside the station hierarchy
  // ensure the station has an assets array (cast to any to satisfy TS)
  (dept.lines[0].stations[0] as any).assets = (dept.lines[0].stations[0] as any).assets || [];
  (dept.lines[0].stations[0] as any).assets.push(asset._id);
  await dept.save();

  // Seed PM Task
  const pmTask = await PMTask.create({
    title: 'Monthly Lubrication',
    asset: asset._id,
    rule: { type: 'calendar', cron: '0 0 1 * *' },
    lastGeneratedAt: new Date(),
    notes: 'Check oil level and apply grease.',
    tenantId,
  });

  const analyticsBase = new Date();
  const day1 = new Date(analyticsBase.getTime() - 2 * 24 * 60 * 60 * 1000);
  const day2 = new Date(analyticsBase.getTime() - 1 * 24 * 60 * 60 * 1000);

  // Seed Work Order
  const workOrder = await WorkOrder.create({
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

  await WorkOrder.insertMany([
    {
      title: 'Line stoppage - Motor',
      asset: asset._id,
      tenantId,
      status: 'completed',
      createdAt: new Date(day1.getTime() + 6 * 60 * 60 * 1000),
      completedAt: new Date(day1.getTime() + 7.5 * 60 * 60 * 1000),
      timeSpentMin: 90,
      failureCode: 'mechanical',
    },
    {
      title: 'Sensor fault reset',
      asset: asset._id,
      tenantId,
      status: 'completed',
      createdAt: new Date(day2.getTime() + 11 * 60 * 60 * 1000),
      completedAt: new Date(day2.getTime() + 12 * 60 * 60 * 1000),
      timeSpentMin: 60,
      failureCode: 'electrical',
    },
  ]);

  await ProductionRecord.insertMany([
    {
      tenantId,
      asset: asset._id,
      site: mainSite._id,
      recordedAt: day1,
      plannedUnits: 1200,
      actualUnits: 1100,
      goodUnits: 1080,
      idealCycleTimeSec: 28,
      plannedTimeMinutes: 720,
      runTimeMinutes: 660,
      downtimeMinutes: 60,
      downtimeReason: 'unplanned-stop',
      energyConsumedKwh: 80,
    },
    {
      tenantId,
      asset: asset._id,
      site: mainSite._id,
      recordedAt: day2,
      plannedUnits: 1150,
      actualUnits: 1050,
      goodUnits: 1025,
      idealCycleTimeSec: 28,
      plannedTimeMinutes: 720,
      runTimeMinutes: 690,
      downtimeMinutes: 30,
      downtimeReason: 'changeover',
      energyConsumedKwh: 78,
    },
  ]);

  await SensorReading.insertMany([
    {
      tenantId,
      asset: asset._id,
      metric: 'energy_kwh',
      value: 45,
      timestamp: new Date(day1.getTime() + 12 * 60 * 60 * 1000),
    },
    {
      tenantId,
      asset: asset._id,
      metric: 'energy_kwh',
      value: 47,
      timestamp: new Date(day2.getTime() + 12 * 60 * 60 * 1000),
    },
  ]);

  // Seed sample Audit Logs
  await AuditLog.insertMany([
    {
      tenantId,
      userId: admin._id,
      action: 'create',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      after: workOrder.toObject(),
      ts: new Date(),
    },
    {
      tenantId,
      userId: admin._id,
      action: 'update',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      before: { status: 'open' },
      after: { status: 'in-progress' },
      ts: new Date(),
    },
  ]);

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

  logger.info('✅ Seed data inserted successfully');
  process.exit();
}).catch((err: unknown) => {
  logger.error('❌ Seed error:', err);
  process.exit(1);
});

/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger';
import Role from './models/Role';
import UserRoleAssignment from './models/UserRoleAssignment';
import { ALL_PERMISSIONS, PERMISSIONS } from '../shared/types/permissions';

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
import Plant from './models/Plant';
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

const seedRoleDefinitions: Array<{ name: string; permissions: string[] }> = [
  { name: 'admin', permissions: ALL_PERMISSIONS },
  { name: 'planner', permissions: [PERMISSIONS.workRequests.read, PERMISSIONS.pm.read, PERMISSIONS.pm.write] },
  {
    name: 'tech',
    permissions: [
      PERMISSIONS.workRequests.read,
      PERMISSIONS.hierarchy.read,
      PERMISSIONS.inventory.read,
      PERMISSIONS.pm.read,
    ],
  },
];

const ensureSeedRoles = async () => {
  const roles = new Map<string, mongoose.Types.ObjectId>();
  for (const definition of seedRoleDefinitions) {
    const role = await Role.findOneAndUpdate(
      { name: definition.name },
      { $set: { permissions: definition.permissions } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    if (role?._id) {
      roles.set(definition.name, role._id as mongoose.Types.ObjectId);
    }
  }
  return roles;
};

const assignRole = async (
  assignments: Map<string, mongoose.Types.ObjectId>,
  userId: mongoose.Types.ObjectId,
  tenantId: mongoose.Types.ObjectId,
  siteId?: mongoose.Types.ObjectId,
  ...roleNames: string[]
) => {
  for (const roleName of roleNames) {
    const roleId = assignments.get(roleName);
    if (!roleId) continue;
    await UserRoleAssignment.updateOne(
      { userId, roleId, tenantId, siteId: siteId ?? null },
      {},
      { upsert: true }
    );
  }
};

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
  await Tenant.create({
    _id: tenantId,
    name: 'Default Tenant',
    domain: 'default.local',
    branding: {
      primaryColor: '#0f766e',
      accentColor: '#ec4899',
    },
  });

  // Seed Site for analytics
  const mainSite = await Site.create({ name: 'Main Plant', slug: 'main-plant', tenantId });

  const seededRoles = await ensureSeedRoles();

  // Seed Users
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'admin123',
    roles: ['admin'],
    tenantId,
    employeeId: 'ADM001',
    siteId: mainSite._id,
  });
  await assignRole(seededRoles, admin._id, tenantId, mainSite._id, 'admin');
  const tech = await User.create({
    name: 'Tech',
    email: 'tech@example.com',
    passwordHash: 'tech123',
    roles: ['tech'],
    tenantId,
    employeeId: 'TECH001',
    siteId: mainSite._id,
  });
  await assignRole(seededRoles, tech._id, tenantId, mainSite._id, 'tech');

  // Additional employee hierarchy
  const departmentLeader = await User.create({
    name: 'Department Leader',
    email: 'department.leader@example.com',
    passwordHash: 'leader123',
    roles: ['supervisor'],
    employeeId: 'DL001',
    tenantId,
    siteId: mainSite._id,
    managerId: admin._id,
  });
  await assignRole(seededRoles, departmentLeader._id, tenantId, mainSite._id, 'admin');

  const areaLeader = await User.create({
    name: 'Area Leader',
    email: 'area.leader@example.com',
    passwordHash: 'area123',
    roles: ['supervisor'],
    employeeId: 'AL001',
    tenantId,
    siteId: mainSite._id,
    managerId: departmentLeader._id,
  });
  await assignRole(seededRoles, areaLeader._id, tenantId, mainSite._id, 'admin');

  const teamLeader = await User.create({
    name: 'Team Leader',
    email: 'team.leader@example.com',
    passwordHash: 'team123',
    roles: ['supervisor'],
    employeeId: 'TL001',
    tenantId,
    siteId: mainSite._id,
    managerId: areaLeader._id,
  });
  await assignRole(seededRoles, teamLeader._id, tenantId, mainSite._id, 'planner');

  await User.insertMany([
    {
      name: 'Team Member One',
      email: 'member.one@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
      employeeId: 'TM001',
      tenantId,
      siteId: mainSite._id,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Two',
      email: 'member.two@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
      employeeId: 'TM002',
      tenantId,
      siteId: mainSite._id,
      managerId: teamLeader._id,
    },
    {
      name: 'Team Member Three',
      email: 'member.three@example.com',
      passwordHash: 'member123',
      roles: ['tech'],
      employeeId: 'TM003',
      tenantId,
      siteId: mainSite._id,
      managerId: teamLeader._id,
    },
  ]);

  const members = await User.find({ managerId: teamLeader._id }).select('_id');
  for (const member of members) {
    await assignRole(seededRoles, member._id as mongoose.Types.ObjectId, tenantId, mainSite._id, 'tech');
  }

  // Seed Department hierarchy
  const dept = await Department.create({
    name: 'Production',
    lines: [],
    tenantId,
    plant: mainPlant._id,
    siteId: mainSite._id,
  });

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
    plant: mainPlant._id,
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
    siteId: mainSite._id,
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
    siteId: mainSite._id,
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
      siteId: mainSite._id,
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
      siteId: mainSite._id,
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
      actor: { id: admin._id, name: admin.name, email: admin.email },
      action: 'create',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      entity: { type: 'WorkOrder', id: workOrder._id.toString(), label: workOrder.title },
      after: workOrder.toObject(),
      ts: new Date(),
    },
    {
      tenantId,
      userId: admin._id,
      actor: { id: admin._id, name: admin.name, email: admin.email },
      action: 'update',
      entityType: 'WorkOrder',
      entityId: workOrder._id,
      entity: { type: 'WorkOrder', id: workOrder._id.toString(), label: workOrder.title },
      before: { status: 'open' },
      after: { status: 'in-progress' },
      diff: [{ path: 'status', before: 'open', after: 'in-progress' }],
      ts: new Date(),
    },
  ]);

  // Seed Notifications
  await Notification.insertMany([
    {
      tenantId,
      title: 'Line A failure',
      message: 'Critical system failure on Line A',
      type: 'critical',
      category: 'overdue',
      deliveryState: 'sent',
    },
    {
      tenantId,
      title: 'PM Due Soon',
      message: 'Pending maintenance due this week',
      type: 'warning',
      category: 'pm_due',
      deliveryState: 'queued',
    },
    {
      tenantId,
      title: 'System Check',
      message: 'System check completed successfully',
      type: 'info',
      category: 'updated',
      deliveryState: 'delivered',
    },
  ]);

  logger.info('✅ Seed data inserted successfully');
  process.exit();
}).catch((err: unknown) => {
  logger.error('❌ Seed error:', err);
  process.exit(1);
});

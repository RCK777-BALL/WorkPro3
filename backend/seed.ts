/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import logger from './utils/logger';
import Role from './models/Role';
import Permission from './models/Permission';
import RolePermission from './models/RolePermission';
import UserRoleAssignment from './models/UserRoleAssignment';
import FeatureFlag from './models/FeatureFlag';
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
import Notification from './models/Notification';
import Tenant from './models/Tenant';
import AuditLog from './models/AuditLog';
import Site from './models/Site';
import Plant from './models/Plant';
import SensorReading from './models/SensorReading';
import ProductionRecord from './models/ProductionRecord';
import WorkRequest from './models/WorkRequest';
import RequestForm from './models/RequestForm';
import RequestType from './models/RequestType';
import DowntimeLog from './models/DowntimeLog';
import DowntimeEvent from './models/DowntimeEvent';
import MetricsRollup from './models/MetricsRollup';
import Vendor from './models/Vendor';
import Location from './models/Location';
import Part from './models/Part';
import StockItem from './models/StockItem';
import PurchaseOrder from './models/PurchaseOrder';
import StockHistory from './models/StockHistory';
import { writeAuditLog } from './utils';
import InspectionTemplate from './models/InspectionTemplate';
import MaintenanceSchedule from './models/MaintenanceSchedule';
import ConditionRule from './models/ConditionRule';
import ProcedureTemplate from './models/ProcedureTemplate';
import ProcedureTemplateVersion from './models/ProcedureTemplateVersion';
import PMTemplateCategory from './models/PMTemplateCategory';
import {
  inspectionTemplates,
  inspectionChecklistIds,
  iotRuleFixture,
  latestInspectionTemplateVersion,
  pmScheduleFixture,
  workOrderWithChecklistFixture,
} from './seedFixtures';
import { generateApiKey } from 'utils/apiKeys';
import ApiKey from 'models/ApiKey';
import WebhookSubscription from 'models/WebhookSubscription';
import ExportJob from 'models/ExportJob';

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

const permissionCatalog = Object.entries(PERMISSIONS).flatMap(([category, actions]) =>
  Object.entries(actions).map(([action, key]) => ({
    key,
    category,
    label: action,
  })),
);

const ensureSeedPermissions = async () => {
  const permissions = new Map<string, mongoose.Types.ObjectId>();
  for (const entry of permissionCatalog) {
    const permission = await Permission.findOneAndUpdate(
      { key: entry.key, tenantId },
      {
        $set: {
          key: entry.key,
          category: entry.category,
          label: entry.label,
          tenantId,
          isSystem: true,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();

    if (permission?._id) {
      permissions.set(entry.key, permission._id as mongoose.Types.ObjectId);
    }
  }
  return permissions;
};

const ensureSeedRoles = async () => {
  const roles = new Map<string, mongoose.Types.ObjectId>();
  for (const definition of seedRoleDefinitions) {
    const role = await Role.findOneAndUpdate(
      { name: definition.name },
      { $set: { permissions: definition.permissions } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();

    if (role?._id) {
      roles.set(definition.name, role._id as mongoose.Types.ObjectId);
    }
  }
  return roles;
};

const ensureRolePermissions = async (
  roles: Map<string, mongoose.Types.ObjectId>,
  permissions: Map<string, mongoose.Types.ObjectId>,
) => {
  for (const definition of seedRoleDefinitions) {
    const roleId = roles.get(definition.name);
    if (!roleId) continue;
    for (const permissionKey of definition.permissions) {
      const permissionId = permissions.get(permissionKey);
      if (!permissionId) continue;
      await RolePermission.updateOne(
        { roleId, permissionId, tenantId, siteId: null, departmentId: null },
        {},
        { upsert: true },
      );
    }
  }
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
  await WorkRequest.deleteMany({});
  await RequestType.deleteMany({});
  await RequestForm.deleteMany({});
  await Tenant.deleteMany({});
  await AuditLog.deleteMany({});
  await Permission.deleteMany({});
  await RolePermission.deleteMany({});
  await FeatureFlag.deleteMany({});
  await Vendor.deleteMany({});
  await Location.deleteMany({});
  await Part.deleteMany({});
  await StockItem.deleteMany({});
  await StockHistory.deleteMany({});
  await PurchaseOrder.deleteMany({});
  await InspectionTemplate.deleteMany({});
  await MaintenanceSchedule.deleteMany({});
  await ConditionRule.deleteMany({});
  await ProcedureTemplate.deleteMany({});
  await ProcedureTemplateVersion.deleteMany({});
  await PMTemplateCategory.deleteMany({});

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

  const seededPermissions = await ensureSeedPermissions();
  const seededRoles = await ensureSeedRoles();
  await ensureRolePermissions(seededRoles, seededPermissions);

  await FeatureFlag.updateOne(
    { tenantId, siteId: null, key: 'rbac_admin' },
    {
      $set: {
        key: 'rbac_admin',
        name: 'RBAC Administration',
        description: 'Enable role and permission administration screens.',
        enabled: true,
        tenantId,
        siteId: null,
      },
    },
    { upsert: true },
  );

  await FeatureFlag.updateOne(
    { tenantId, siteId: null, key: 'audit_log_export' },
    {
      $set: {
        key: 'audit_log_export',
        name: 'Audit Log Export',
        description: 'Enable CSV export for audit logs.',
        enabled: true,
        tenantId,
        siteId: null,
      },
    },
    { upsert: true },
  );

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

  const generatedKey = generateApiKey();
  await ApiKey.create({
    name: 'Default Integration Key',
    keyHash: generatedKey.keyHash,
    prefix: generatedKey.prefix,
    tenantId,
    createdBy: admin._id,
    rateLimitMax: 120,
  });

  await WebhookSubscription.create({
    name: 'Sample Work Order Webhook',
    url: 'https://example.com/webhooks/workorders',
    events: ['WO.created', 'WO.updated'],
    secret: generateApiKey().key,
    tenantId,
    active: true,
    maxAttempts: 3,
  });

  await ExportJob.create({
    tenantId,
    requestedBy: admin._id,
    type: 'workOrders',
    format: 'csv',
    status: 'queued',
  });

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
    plant: mainSite._id,
    siteId: mainSite._id,
  });

  const line = { name: 'Line A', stations: [] } as any;
  line.stations.push({ name: 'Station 1' });
  dept.lines.push(line);
  await dept.save();

  const lineId = dept.lines[0]._id;
  const stationId = dept.lines[0].stations[0]._id;

  // Seed Assets
  const assetData = {
    name: 'Conveyor Belt',
    type: 'Mechanical',
    location: 'Line A - Station 1',
    departmentId: dept._id,
    lineId,
    stationId,
    plant: mainSite._id,
    status: 'Active',
    description: 'Main conveyor belt for packaging line',
    tenantId,
    siteId: mainSite._id,
  };

  const asset = await Asset.create(assetData);
  const assetB = await Asset.create({
    ...assetData,
    name: 'Packaging Robot',
    description: 'Robotic arm handling packaging and case sealing',
    type: 'Automation',
  });

  // Also store the asset references inside the station hierarchy
  // ensure the station has an assets array (cast to any to satisfy TS)
  (dept.lines[0].stations[0] as any).assets = (dept.lines[0].stations[0] as any).assets || [];
  (dept.lines[0].stations[0] as any).assets.push(asset._id, assetB._id);
  await dept.save();

  // Seed PM Task
  const procedureCategory = await PMTemplateCategory.create({
    name: 'Safety',
    description: 'Safety-related procedures',
    tenantId,
    siteId: mainSite._id,
  });
  const procedureTemplate = await ProcedureTemplate.create({
    name: 'Lubrication Procedure',
    description: 'Monthly lubrication and inspection steps.',
    category: procedureCategory._id,
    tenantId,
    siteId: mainSite._id,
  });
  const procedureVersion = await ProcedureTemplateVersion.create({
    tenantId,
    templateId: procedureTemplate._id,
    versionNumber: 1,
    status: 'published',
    durationMinutes: 30,
    safetySteps: ['Lock out power and confirm zero energy.'],
    steps: ['Apply grease to bearings.', 'Check oil level and top off.'],
    requiredParts: [],
    requiredTools: [{ toolName: 'Grease gun', quantity: 1 }],
    notes: 'Record any abnormalities observed.',
  });
  procedureTemplate.latestPublishedVersion = procedureVersion._id;
  await procedureTemplate.save();
  const pmTask = await PMTask.create({
    title: 'Monthly Lubrication',
    asset: asset._id,
    rule: { type: 'calendar', cron: '0 0 1 * *' },
    lastGeneratedAt: new Date(),
    notes: 'Check oil level and apply grease.',
    procedureTemplateId: procedureTemplate._id,
    tenantId,
    siteId: mainSite._id,
  });

  const insertedInspectionTemplates = await InspectionTemplate.insertMany(
    inspectionTemplates.map((template) => ({
      ...template,
      tenantId,
      siteId: mainSite._id,
      createdBy: admin._id,
    })),
  );
  const latestInspectionTemplate = insertedInspectionTemplates.reduce((latest, current) =>
    current.version > latest.version ? current : latest,
  );

  const pmScheduleNextDue = new Date();
  pmScheduleNextDue.setDate(pmScheduleNextDue.getDate() + 7);

  await MaintenanceSchedule.create({
    tenantId,
    siteId: mainSite._id,
    assetId: asset._id.toString(),
    title: pmScheduleFixture.title,
    description: pmScheduleFixture.description,
    frequency: pmScheduleFixture.frequency,
    nextDue: pmScheduleNextDue,
    estimatedDuration: pmScheduleFixture.estimatedDuration,
    instructions: `${pmScheduleFixture.instructions} Tracking ${latestInspectionTemplate.name} v${latestInspectionTemplateVersion}.`,
    type: pmScheduleFixture.type,
    repeatConfig: pmScheduleFixture.repeatConfig,
    parts: inspectionChecklistIds,
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

  const completedChecklistWorkOrder = await WorkOrder.create({
    ...workOrderWithChecklistFixture,
    tenantId,
    siteId: mainSite._id,
    asset: asset._id,
    pmTask: pmTask._id,
    templateKey: `${latestInspectionTemplate.name}-v${latestInspectionTemplate.version}`,
    type: 'preventive',
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
    {
      title: 'Robot gripper jam',
      asset: assetB._id,
      tenantId,
      status: 'completed',
      createdAt: new Date(day1.getTime() + 3 * 60 * 60 * 1000),
      completedAt: new Date(day1.getTime() + 4.5 * 60 * 60 * 1000),
      timeSpentMin: 90,
      failureCode: 'mechanical',
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
    {
      tenantId,
      asset: assetB._id,
      site: mainSite._id,
      recordedAt: day1,
      plannedUnits: 900,
      actualUnits: 840,
      goodUnits: 820,
      idealCycleTimeSec: 18,
      plannedTimeMinutes: 720,
      runTimeMinutes: 640,
      downtimeMinutes: 80,
      downtimeReason: 'robot-adjustment',
      energyConsumedKwh: 65,
    },
    {
      tenantId,
      asset: assetB._id,
      site: mainSite._id,
      recordedAt: day2,
      plannedUnits: 950,
      actualUnits: 900,
      goodUnits: 885,
      idealCycleTimeSec: 18,
      plannedTimeMinutes: 720,
      runTimeMinutes: 675,
      downtimeMinutes: 45,
      downtimeReason: 'sensor-realignment',
      energyConsumedKwh: 70,
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
    {
      tenantId,
      asset: assetB._id,
      metric: 'energy_kwh',
      value: 38,
      timestamp: new Date(day1.getTime() + 11 * 60 * 60 * 1000),
    },
    {
      tenantId,
      asset: assetB._id,
      metric: 'energy_kwh',
      value: 36,
      timestamp: new Date(day2.getTime() + 11 * 60 * 60 * 1000),
    },
  ]);

  await DowntimeLog.insertMany([
    {
      tenantId,
      assetId: asset._id,
      start: new Date(day1.getTime() + 1.5 * 60 * 60 * 1000),
      end: new Date(day1.getTime() + 2.25 * 60 * 60 * 1000),
      reason: 'belt-alignment',
    },
    {
      tenantId,
      assetId: asset._id,
      start: new Date(day2.getTime() + 9 * 60 * 60 * 1000),
      end: new Date(day2.getTime() + 9.5 * 60 * 60 * 1000),
      reason: 'sensor-trip',
    },
    {
      tenantId,
      assetId: assetB._id,
      start: new Date(day1.getTime() + 5 * 60 * 60 * 1000),
      end: new Date(day1.getTime() + 6.75 * 60 * 60 * 1000),
      reason: 'gripper-jam',
    },
    {
      tenantId,
      assetId: assetB._id,
      start: new Date(day2.getTime() + 7 * 60 * 60 * 1000),
      end: new Date(day2.getTime() + 7.25 * 60 * 60 * 1000),
      reason: 'camera-calibration',
    },
  ]);

  await DowntimeEvent.insertMany([
    {
      tenantId,
      assetId: asset._id,
      workOrderId: workOrder._id,
      start: new Date(day1.getTime() + 2 * 60 * 60 * 1000),
      end: new Date(day1.getTime() + 3 * 60 * 60 * 1000),
      causeCode: 'alignment',
      reason: 'Align conveyor belt',
      impactMinutes: 60,
    },
    {
      tenantId,
      assetId: asset._id,
      start: new Date(day2.getTime() + 4 * 60 * 60 * 1000),
      end: new Date(day2.getTime() + 4.5 * 60 * 60 * 1000),
      causeCode: 'sensor',
      reason: 'Sensor recalibration',
      impactMinutes: 30,
    },
    {
      tenantId,
      assetId: assetB._id,
      start: new Date(day1.getTime() + 6 * 60 * 60 * 1000),
      end: new Date(day1.getTime() + 7.5 * 60 * 60 * 1000),
      causeCode: 'mechanical',
      reason: 'Gripper jam cleared',
      impactMinutes: 90,
    },
  ]);

  await MetricsRollup.insertMany([
    {
      tenantId,
      siteId: mainSite._id,
      assetId: asset._id,
      assetName: asset.name,
      period: new Date(day1.toISOString().slice(0, 10)),
      granularity: 'day',
      workOrders: 2,
      completedWorkOrders: 2,
      mttrHours: 1.5,
      mtbfHours: 24,
      pmTotal: 1,
      pmCompleted: 1,
      pmCompliance: 100,
      downtimeMinutes: 105,
    },
    {
      tenantId,
      siteId: mainSite._id,
      assetId: assetB._id,
      assetName: assetB.name,
      period: new Date(day1.toISOString().slice(0, 10)),
      granularity: 'day',
      workOrders: 1,
      completedWorkOrders: 1,
      mttrHours: 1.2,
      mtbfHours: 18,
      pmTotal: 1,
      pmCompleted: 0,
      pmCompliance: 0,
      downtimeMinutes: 135,
    },
    {
      tenantId,
      siteId: mainSite._id,
      period: new Date(day2.toISOString().slice(0, 10)),
      granularity: 'day',
      workOrders: 2,
      completedWorkOrders: 2,
      mttrHours: 1.25,
      mtbfHours: 20,
      pmTotal: 2,
      pmCompleted: 1,
      pmCompliance: 50,
      downtimeMinutes: 75,
    },
  ]);

  await ConditionRule.create({
    ...iotRuleFixture,
    tenantId,
    asset: asset._id,
  });

  const requestType = await RequestType.create({
    name: 'Maintenance Request',
    slug: 'maintenance-request',
    category: 'maintenance',
    description: 'Default maintenance request type',
    requiredFields: ['title', 'requesterName'],
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'] },
    ],
    attachments: [],
    defaultPriority: 'medium',
    tenantId,
    siteId: mainSite._id,
  });

  const requestForm = await RequestForm.create({
    slug: 'default-maintenance-request',
    name: 'Default Maintenance Request',
    description: 'Capture maintenance requests from operators',
    requestType: requestType._id,
    schema: { fields: requestType.fields },
    fields: requestType.fields,
    attachments: [],
    tenantId,
    siteId: mainSite._id,
  });

  await WorkRequest.create({
    token: 'REQ-SUBMITTED-001',
    title: 'Noise from conveyor belt',
    description: 'Operators reported unusual noise coming from the conveyor belt.',
    requesterName: 'Line Operator',
    requesterEmail: 'operator@example.com',
    priority: 'high',
    status: 'reviewing',
    siteId: mainSite._id,
    tenantId,
    requestForm: requestForm._id,
    requestType: requestType._id,
    category: requestType.category,
    location: asset.location,
    assetTag: asset.name,
    photos: [],
  });

  const convertedRequest = await WorkRequest.create({
    token: 'REQ-CONVERTED-001',
    title: 'Replace worn belt section',
    description: 'A section of the conveyor belt is fraying and needs replacement.',
    requesterName: 'Shift Supervisor',
    requesterEmail: 'supervisor@example.com',
    priority: 'medium',
    status: 'reviewing',
    siteId: mainSite._id,
    tenantId,
    requestForm: requestForm._id,
    requestType: requestType._id,
    category: requestType.category,
    location: asset.location,
    assetTag: asset.name,
    photos: [],
  });

  const convertedWorkOrder = await WorkOrder.create({
    title: convertedRequest.title,
    asset: asset._id,
    description: convertedRequest.description,
    priority: 'high',
    status: 'open',
    assignedTo: tech._id,
    teamMemberName: 'Tech',
    line: lineId,
    station: stationId,
    department: dept._id,
    importance: 'medium',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    tenantId,
    siteId: mainSite._id,
    requestId: convertedRequest._id,
  });

    convertedRequest.status = 'converted';
    convertedRequest.workOrder = convertedWorkOrder._id;
    convertedRequest.decision = { convertedWorkOrderId: convertedWorkOrder._id };
    await convertedRequest.save();

    // Seed inventory vendors, locations, parts, and purchase orders
    const [acmeIndustrial, northwind] = await Vendor.insertMany([
      {
        tenantId,
        name: 'ACME Industrial',
        email: 'orders@acme-industrial.test',
        phone: '+1-555-555-1001',
      },
      {
        tenantId,
        name: 'Northwind Supplies',
        email: 'sales@northwind.test',
        phone: '+1-555-555-2002',
      },
    ]);

    const [mainWarehouse, lineACabinet] = await Location.insertMany([
      { tenantId, siteId: mainSite._id, name: 'Main Warehouse', store: 'A', room: '100', bin: 'A-01' },
      { tenantId, siteId: mainSite._id, name: 'Line A Cabinet', store: 'Line A', room: 'Cabinet', bin: 'Shelf 2' },
    ]);

    const [bearing, belt] = await Part.insertMany([
      {
        tenantId,
        siteId: mainSite._id,
        partNo: 'BRG-6203',
        description: '6203 sealed bearing',
        unit: 'each',
        cost: 12.5,
        reorderPoint: 10,
        leadTime: 5,
      },
      {
        tenantId,
        siteId: mainSite._id,
        partNo: 'BLT-500',
        description: '500mm drive belt',
        unit: 'each',
        cost: 45,
        reorderPoint: 4,
        leadTime: 7,
      },
    ]);

    const [bearingStock, beltStock] = await StockItem.insertMany([
      {
        tenantId,
        siteId: mainSite._id,
        part: bearing._id,
        location: mainWarehouse._id,
        quantity: 25,
        unitCost: 12.5,
      },
      {
        tenantId,
        siteId: mainSite._id,
        part: belt._id,
        location: lineACabinet._id,
        quantity: 4,
        unitCost: 45,
      },
    ]);

    const draftPo = await PurchaseOrder.create({
      tenantId,
      siteId: mainSite._id,
      poNumber: 'PO-1001',
      vendorId: acmeIndustrial._id,
      status: 'Draft',
      lines: [
        { part: bearing._id, qtyOrdered: 8, qtyReceived: 0, price: 12.5 },
        { part: belt._id, qtyOrdered: 3, qtyReceived: 0, price: 45 },
      ],
    });

    await writeAuditLog({
      tenantId,
      siteId: mainSite._id,
      userId: admin._id,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId: draftPo._id,
      after: draftPo.toObject(),
      entityLabel: draftPo.poNumber,
    });

    const sentPo = await PurchaseOrder.create({
      tenantId,
      siteId: mainSite._id,
      poNumber: 'PO-1002',
      vendorId: northwind._id,
      status: 'Approved',
      lines: [
        { part: bearing._id, qtyOrdered: 15, qtyReceived: 0, price: 11.75 },
        { part: belt._id, qtyOrdered: 6, qtyReceived: 0, price: 42 },
      ],
    });

    await writeAuditLog({
      tenantId,
      siteId: mainSite._id,
      userId: admin._id,
      action: 'create',
      entityType: 'PurchaseOrder',
      entityId: sentPo._id,
      after: sentPo.toObject(),
      entityLabel: sentPo.poNumber,
    });

    const sendBefore = sentPo.toObject();
    sentPo.status = 'Ordered';
    await sentPo.save();
    await writeAuditLog({
      tenantId,
      siteId: mainSite._id,
      userId: admin._id,
      action: 'update',
      entityType: 'PurchaseOrder',
      entityId: sentPo._id,
      before: sendBefore,
      after: sentPo.toObject(),
      entityLabel: sentPo.poNumber,
      diff: [{ path: 'status', before: sendBefore.status, after: sentPo.status }],
    });

    const receiptBefore = sentPo.toObject();
    const partialBearingReceipt = 6;
    const partialBeltReceipt = 2;
    sentPo.lines = sentPo.lines.map((line) => {
      if (line.part.toString() === bearing._id.toString()) {
        return { ...line, qtyReceived: partialBearingReceipt };
      }
      if (line.part.toString() === belt._id.toString()) {
        return { ...line, qtyReceived: partialBeltReceipt };
      }
      return line;
    });
    await sentPo.save();

    bearingStock.quantity += partialBearingReceipt;
    beltStock.quantity += partialBeltReceipt;
    await bearingStock.save();
    await beltStock.save();

    await StockHistory.insertMany([
      {
        tenantId,
        siteId: mainSite._id,
        stockItem: bearingStock._id,
        part: bearingStock.part,
        delta: partialBearingReceipt,
        reason: `PO ${sentPo.poNumber} receipt`,
        userId: admin._id,
        balance: bearingStock.quantity,
      },
      {
        tenantId,
        siteId: mainSite._id,
        stockItem: beltStock._id,
        part: beltStock.part,
        delta: partialBeltReceipt,
        reason: `PO ${sentPo.poNumber} receipt`,
        userId: admin._id,
        balance: beltStock.quantity,
      },
    ]);

    await writeAuditLog({
      tenantId,
      siteId: mainSite._id,
      userId: admin._id,
      action: 'receive',
      entityType: 'PurchaseOrder',
      entityId: sentPo._id,
      before: receiptBefore,
      after: sentPo.toObject(),
      entityLabel: sentPo.poNumber,
    });

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

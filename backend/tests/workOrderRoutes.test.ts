/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WorkOrderRoutes from '../routes/workOrdersRoutes';
import Asset from '../models/Asset';
import Department from '../models/Department';
import Line from '../models/Line';
import Station from '../models/Station';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import Permit from '../models/Permit';
import AuditLog from '../models/AuditLog';
import Site from '../models/Site';

vi.mock('../server', () => ({
  emitWorkOrderUpdate: vi.fn(),
}));


const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let department: Awaited<ReturnType<typeof Department.create>>;
let lineId: mongoose.Types.ObjectId;
let stationId: mongoose.Types.ObjectId;
let pmTask: Awaited<ReturnType<typeof PMTask.create>>;
let site: Awaited<ReturnType<typeof Site.create>>;
const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'x-site-id': site._id.toString() });

// Hold the user created for authentication
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-1',
  });
  site = await Site.create({
    tenantId: user.tenantId,
    name: 'Main Site',
    slug: `main-${Date.now()}`,
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString(), siteId: site._id.toString() },
    process.env.JWT_SECRET!,
  );

  department = await Department.create({
    name: 'Prod',
    tenantId: user.tenantId,
    plant: site._id,
      siteId: site._id,
    lines: [
      {
        name: 'Line1',
        tenantId: user.tenantId,
        stations: [{ name: 'Station1', tenantId: user.tenantId }],
      },
    ],
  });
  lineId = department.lines[0]._id;
  stationId = department.lines[0].stations[0]._id;
  pmTask = await PMTask.create({
    title: 'PM1',
    tenantId: user.tenantId,
    rule: { type: 'calendar', cron: '0 0 * * *' },
  });
});

describe('Work Order Routes', () => {
  it('creates and fetches work orders', async () => {
    const asset = await Asset.create({
      name: 'Asset1',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });

    const createRes = await request(app)
      .post('/api/workorders')
      .set(authHeaders())
      .send({
        title: 'WO1',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        type: 'calibration',
        complianceProcedureId: 'PROC-1',
        calibrationIntervalDays: 365,
        departmentId: department._id,
        lineId,
        stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const created = createRes.body.data;
    expect(created.department).toBe(String(department._id));
    expect(created.line).toBe(String(lineId));
    expect(created.station).toBe(String(stationId));
    expect(created.pmTask).toBe(String(pmTask._id));
    expect(created.teamMemberName).toBe('Tester');
    expect(created.importance).toBe('low');
    expect(created.type).toBe('calibration');
    expect(created.complianceProcedureId).toBe('PROC-1');
    expect(created.calibrationIntervalDays).toBe(365);

    const stored = await WorkOrder.findById(created._id).lean();
    expect(stored).not.toBeNull();
    expect(stored?.department?.toString()).toBe(String(department._id));
    expect(stored?.line?.toString()).toBe(String(lineId));
    expect(stored?.station?.toString()).toBe(String(stationId));

    const id = created._id;

    const listRes = await request(app)
      .get('/api/workorders')
      .set(authHeaders())
      .expect(200);

    expect(listRes.body.success).toBe(true);
    const listData = listRes.body.data;
    expect(Array.isArray(listData)).toBe(true);
    expect(listData.length).toBe(1);
    const logs = await AuditLog.find({ entityType: 'WorkOrder', action: 'create' });
    expect(logs.length).toBe(1);
    expect(logs[0].entityId).toBe(String(id));
    const first = listData[0];
    expect(first._id).toBe(id);
    expect(first.department).toBe(String(department._id));
    expect(first.line).toBe(String(lineId));
    expect(first.station).toBe(String(stationId));
    expect(first.pmTask).toBe(String(pmTask._id));
    expect(first.teamMemberName).toBe('Tester');
    expect(first.importance).toBe('low');
    expect(first.type).toBe('calibration');
    expect(first.complianceProcedureId).toBe('PROC-1');
    expect(first.calibrationIntervalDays).toBe(365);
    expect(typeof first.toObject).toBe('undefined');
  });

  it('fails to create a work order when required fields are missing', async () => {
    const asset = await Asset.create({
      name: 'AssetNoDue',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });

    await request(app)
      .post('/api/workorders')
      .set(authHeaders())
      .send({
        assetId: asset._id,
 
      })
      .expect(400);
  });

  it('updates and deletes a work order', async () => {
    const asset = await Asset.create({
      name: 'Asset2',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });

    const createRes = await request(app)
      .post('/api/workorders')
      .set(authHeaders())
      .send({
        title: 'WO2',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        lineId,
        stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const created = createRes.body.data;
    expect(created.department).toBe(String(department._id));

    const id = created._id;

    const updateRes = await request(app)
      .put(`/api/workorders/${id}`)
      .set(authHeaders())
      .send({ title: 'Updated WO' })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.title).toBe('Updated WO');

    await request(app)
      .delete(`/api/workorders/${id}`)
      .set(authHeaders())
      .expect(200);

    const listAfter = await request(app)
      .get('/api/workorders')
      .set(authHeaders())
      .expect(200);

    expect(listAfter.body.success).toBe(true);
    expect(listAfter.body.data.length).toBe(0);
  });

  it('handles status transitions', async () => {
    const asset = await Asset.create({
      name: 'AssetTrans',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });

    const createRes = await request(app)
      .post('/api/workorders')
      .set(authHeaders())
      .send({
        title: 'WO-Trans',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        lineId,
        stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
        assetId: asset._id,
      })
      .expect(201);

    const id = createRes.body.data._id;

    const assignRes = await request(app)
      .post(`/api/workorders/${id}/assign`)
      .set(authHeaders())
      .send({ assignees: [user._id] })
      .expect(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.status).toBe('assigned');

    const startRes = await request(app)
      .post(`/api/workorders/${id}/start`)
      .set(authHeaders())
      .expect(200);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.data.status).toBe('in_progress');

    const completeRes = await request(app)
      .post(`/api/workorders/${id}/complete`)
      .set(authHeaders())
      .send({ timeSpentMin: 5 })
      .expect(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.timeSpentMin).toBe(5);

    const cancelRes = await request(app)
      .post(`/api/workorders/${id}/cancel`)
      .set(authHeaders())
      .expect(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('cancelled');
  });

  it('rejects completing a work order when linked permit is not ready for completion', async () => {
    const workOrder = await WorkOrder.create({
      title: 'WO with Permit',
      description: 'desc',
      priority: 'medium',
      status: 'in_progress',
      type: 'corrective',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      department: department._id,
      line: lineId,
      station: stationId,
      pmTask: pmTask._id,
    });

    const permit = await Permit.create({
      permitNumber: 'PERM-123',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      workOrder: workOrder._id,
      type: 'hot-work',
      status: 'active',
      isolationSteps: [
        {
          description: 'Lockout procedure',
          completed: false,
        },
      ],
    });

    workOrder.permits.push(permit._id);
    await workOrder.save();

    const res = await request(app)
      .post(`/api/workorders/${workOrder._id}/complete`)
      .set(authHeaders())
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Isolation steps remain open');
  });

  it('searches work orders by status', async () => {
    const wo1 = await WorkOrder.create({
      title: 'StatusWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      createdAt: new Date('2024-01-01'),
    });
    await WorkOrder.create({
      title: 'OtherWO',
      priority: 'low',
      status: 'completed',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      createdAt: new Date('2024-02-01'),
    });

    const res = await request(app)
      .get('/api/workorders/search?status=requested')
      .set(authHeaders())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id).toBe(wo1._id.toString());
    expect(typeof res.body.data[0].toObject).toBe('undefined');
  });

  it('searches work orders by priority', async () => {
    await WorkOrder.create({
      title: 'HighPriority',
      priority: 'high',
      status: 'requested',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });
    await WorkOrder.create({
      title: 'LowPriority',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });

    const res = await request(app)
      .get('/api/workorders/search?priority=high')
      .set(authHeaders())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].priority).toBe('high');
  });

  it('searches work orders by date range', async () => {
    await WorkOrder.create({
      title: 'OldWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      createdAt: new Date('2024-01-01'),
    });
    const woInRange = await WorkOrder.create({
      title: 'InRangeWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
      createdAt: new Date('2024-02-01'),
    });

    const res = await request(app)
      .get('/api/workorders/search?startDate=2024-01-15&endDate=2024-02-15')
      .set(authHeaders())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id).toBe(woInRange._id.toString());
  });
});


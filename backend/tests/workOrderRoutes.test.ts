/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WorkOrderRoutes from '../routes/WorkOrderRoutes';
import Asset from '../models/Asset';
import Department from '../models/Department';
import Line from '../models/Line';
import Station from '../models/Station';
import PMTask from '../models/PMTask';
import WorkOrder from '../models/WorkOrder';
import AuditLog from '../models/AuditLog';


const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let department: Awaited<ReturnType<typeof Department.create>>;
let lineId: mongoose.Types.ObjectId;
let stationId: mongoose.Types.ObjectId;
let pmTask: Awaited<ReturnType<typeof PMTask.create>>;

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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);

  department = await Department.create({
    name: 'Prod',
    tenantId: user.tenantId,
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
    });

    const createRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'WO1',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        department: department._id,
        line: lineId,
        station: stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
      })
      .expect(201);

    expect(createRes.body.department).toBe(String(department._id));
    expect(createRes.body.line).toBe(String(lineId));
    expect(createRes.body.station).toBe(String(stationId));
    expect(createRes.body.pmTask).toBe(String(pmTask._id));
    expect(createRes.body.teamMemberName).toBe('Tester');
    expect(createRes.body.importance).toBe('low');

    const id = createRes.body._id;

    const listRes = await request(app)
      .get('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.length).toBe(1);
    const logs = await AuditLog.find({ entityType: 'WorkOrder', action: 'create' });
    expect(logs.length).toBe(1);
    expect(logs[0].entityId).toBe(String(id));
    expect(listRes.body[0]._id).toBe(id);
    expect(listRes.body[0].department).toBe(String(department._id));
    expect(listRes.body[0].line).toBe(String(lineId));
    expect(listRes.body[0].station).toBe(String(stationId));
    expect(listRes.body[0].pmTask).toBe(String(pmTask._id));
    expect(listRes.body[0].teamMemberName).toBe('Tester');
    expect(listRes.body[0].importance).toBe('low');
  });

  it('fails to create a work order when required fields are missing', async () => {
    const asset = await Asset.create({
      name: 'AssetNoDue',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
    });

    await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        asset: asset._id,
 
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
    });

  const createRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'WO2',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        department: department._id,
        line: lineId,
        station: stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
      })
      .expect(201);

    expect(createRes.body.department).toBe(String(department._id));

    const id = createRes.body._id;

    const updateRes = await request(app)
      .put(`/api/workorders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated WO' })
      .expect(200);

    expect(updateRes.body.title).toBe('Updated WO');

    await request(app)
      .delete(`/api/workorders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfter = await request(app)
      .get('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listAfter.body.length).toBe(0);
  });

  it('handles status transitions', async () => {
    const asset = await Asset.create({
      name: 'AssetTrans',
      type: 'Mechanical',
      location: 'Area 1',
      department: 'Production',
      status: 'Active',
      tenantId: user.tenantId,
    });

    const createRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'WO-Trans',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        department: department._id,
        line: lineId,
        station: stationId,
        pmTask: pmTask._id,
        teamMemberName: 'Tester',
        importance: 'low',
        asset: asset._id,
      })
      .expect(201);

    const id = createRes.body._id;

    const assignRes = await request(app)
      .post(`/api/workorders/${id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignees: [user._id] })
      .expect(200);
    expect(assignRes.body.status).toBe('assigned');

    const startRes = await request(app)
      .post(`/api/workorders/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(startRes.body.status).toBe('in_progress');

    const completeRes = await request(app)
      .post(`/api/workorders/${id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ timeSpentMin: 5 })
      .expect(200);
    expect(completeRes.body.status).toBe('completed');
    expect(completeRes.body.timeSpentMin).toBe(5);

    const cancelRes = await request(app)
      .post(`/api/workorders/${id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelRes.body.status).toBe('cancelled');
  });

  it('searches work orders by status', async () => {
    const wo1 = await WorkOrder.create({
      title: 'StatusWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      dateCreated: new Date('2024-01-01'),
    });
    await WorkOrder.create({
      title: 'OtherWO',
      priority: 'low',
      status: 'completed',
      tenantId: user.tenantId,
      dateCreated: new Date('2024-02-01'),
    });

    const res = await request(app)
      .get('/api/workorders/search?status=requested')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(wo1._id.toString());
  });

  it('searches work orders by priority', async () => {
    await WorkOrder.create({
      title: 'HighPriority',
      priority: 'high',
      status: 'requested',
      tenantId: user.tenantId,
    });
    await WorkOrder.create({
      title: 'LowPriority',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
    });

    const res = await request(app)
      .get('/api/workorders/search?priority=high')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0].priority).toBe('high');
  });

  it('searches work orders by date range', async () => {
    await WorkOrder.create({
      title: 'OldWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      dateCreated: new Date('2024-01-01'),
    });
    const woInRange = await WorkOrder.create({
      title: 'InRangeWO',
      priority: 'low',
      status: 'requested',
      tenantId: user.tenantId,
      dateCreated: new Date('2024-02-01'),
    });

    const res = await request(app)
      .get('/api/workorders/search?startDate=2024-01-15&endDate=2024-02-15')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(woInRange._id.toString());
  });
});

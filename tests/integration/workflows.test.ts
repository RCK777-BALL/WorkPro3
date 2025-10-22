import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import AuthRoutes from '../../backend/routes/AuthRoutes';
import DepartmentRoutes from '../../backend/routes/DepartmentRoutes';
import LineRoutes from '../../backend/routes/LineRoutes';
import StationRoutes from '../../backend/routes/StationRoutes';
import AssetRoutes from '../../backend/routes/AssetRoutes';
import PMTaskRoutes from '../../backend/routes/PMTaskRoutes';
import WorkOrderRoutes from '../../backend/routes/workOrdersRoutes';
import TeamRoutes from '../../backend/routes/TeamRoutes';
import SummaryRoutes from '../../backend/routes/SummaryRoutes';

import Tenant from '../../backend/models/Tenant';
import User from '../../backend/models/User';
import Department from '../../backend/models/Department';
import Line from '../../backend/models/Line';
import Station from '../../backend/models/Station';
import Asset from '../../backend/models/Asset';
import WorkOrder from '../../backend/models/WorkOrder';

const TEST_PASSWORD = 'Password123!';

describe('CMMS end-to-end workflows', () => {
  let app: express.Express;
  let mongo: MongoMemoryServer;
  let adminToken: string;
  let adminId: string;
  let tenantId: string;
  let techCredentials: { email: string; password: string };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({
      binary: { systemBinary: '/usr/bin/mongod' },
    });
    await mongoose.connect(mongo.getUri());

    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', AuthRoutes);
    app.use('/api/departments', DepartmentRoutes);
    app.use('/api/lines', LineRoutes);
    app.use('/api/stations', StationRoutes);
    app.use('/api/assets', AssetRoutes);
    app.use('/api/pm', PMTaskRoutes);
    app.use('/api/workorders', WorkOrderRoutes);
    app.use('/api/team', TeamRoutes);
    app.use('/api/summary', SummaryRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();

    const tenant = await Tenant.create({ name: 'Integration Tenant' });
    tenantId = tenant._id.toString();

    const techEmail = 'tech.user@example.com';
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Tech User',
        email: techEmail,
        password: TEST_PASSWORD,
        tenantId,
        employeeId: 'EMP-1001',
      })
      .expect(201);

    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.message).toBe('User registered successfully');
    expect(registerRes.body.data.email).toBe(techEmail);
    techCredentials = { email: techEmail, password: TEST_PASSWORD };

    await User.create({
      name: 'Admin Owner',
      email: 'admin@example.com',
      passwordHash: TEST_PASSWORD,
      roles: ['admin'],
      tenantId: tenant._id,
      employeeId: 'EMP-ADMIN',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: TEST_PASSWORD })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.message).toBe('Login successful');
    adminToken = loginRes.body.data.token;
    adminId = loginRes.body.data.user.id;
  });

  it('validates authentication, hierarchy CRUD, PM, work orders, team, and summary flows', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: techCredentials.email, password: 'incorrect' })
      .expect(400);

    const techLogin = await request(app)
      .post('/api/auth/login')
      .send(techCredentials)
      .expect(200);
    expect(techLogin.body.success).toBe(true);
    expect(techLogin.body.data.user.email).toBe(techCredentials.email);

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Department lifecycle
    const departmentRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Assembly' })
      .expect(201);

    expect(departmentRes.body.success).toBe(true);
    const departmentData = departmentRes.body.data;
    expect(departmentData._id).toBeDefined();
    expect(departmentData.lines).toEqual([]);
    const departmentId = departmentData._id as string;

    const updatedDepartment = await request(app)
      .put(`/api/departments/${departmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Assembly North' })
      .expect(200);
    expect(updatedDepartment.body.success).toBe(true);
    expect(updatedDepartment.body.data.name).toBe('Assembly North');

    // Line CRUD
    const lineRes = await request(app)
      .post('/api/lines')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Line A', departmentId })
      .expect(201);
    expect(lineRes.body.success).toBe(true);
    expect(lineRes.body.data.departmentId).toBe(departmentId);
    const lineId = lineRes.body.data._id as string;

    const stationRes = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Station 1', lineId })
      .expect(201);
    expect(stationRes.body.success).toBe(true);
    const stationId = stationRes.body.data._id as string;

    const assetTypes = ['Electrical', 'Mechanical', 'Tooling', 'Interface'] as const;
    for (const type of assetTypes) {
      const assetRes = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `${type} Asset`,
          type,
          location: 'Main Floor',
          departmentId,
          lineId,
          stationId,
          status: 'Active',
          criticality: 'medium',
        })
        .expect(201);

      expect(assetRes.body.success).toBe(true);
      expect(assetRes.body.data.type).toBe(type);
    }

    const pmTaskRes = await request(app)
      .post('/api/pm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Quarterly Inspection',
        rule: { type: 'calendar', cron: '0 0 1 * *' },
      })
      .expect(201);

    expect(pmTaskRes.body.success).toBe(true);
    const pmTaskId = pmTaskRes.body.data._id as string;

    const teamRes = await request(app)
      .post('/api/team')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alice Maintainer',
        email: 'alice@example.com',
        role: 'admin',
        department: departmentId,
        employeeId: 'TEAM-100',
      })
      .expect(201);

    expect(teamRes.body.success).toBe(true);
    const teamMemberId = teamRes.body.data._id as string;

    const teamUpdate = await request(app)
      .put(`/api/team/${teamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alice Maintainer',
        email: 'alice@example.com',
        role: 'supervisor',
        department: departmentId,
        employeeId: 'TEAM-100',
      })
      .expect(200);
    expect(teamUpdate.body.success).toBe(true);
    expect(teamUpdate.body.data.role).toBe('supervisor');

    // Work order creation
    const workOrderRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId,
        title: 'Replace filter',
        description: 'Replace the primary coolant filter',
        priority: 'medium',
        status: 'requested',
        type: 'preventive',
        line: lineId,
        station: stationId,
        pmTask: pmTaskId,
        teamMemberName: 'Alice Maintainer',
        importance: 'high',
        complianceProcedureId: 'PROC-42',
        calibrationIntervalDays: 90,
      })
      .expect(201);

    expect(workOrderRes.body.success).toBe(true);
    const workOrderId = workOrderRes.body.data._id as string;

    const assignRes = await request(app)
      .post(`/api/workorders/${workOrderId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignees: [adminId] })
      .expect(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.status).toBe('assigned');

    await request(app)
      .post(`/api/workorders/${workOrderId}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    const completeRes = await request(app)
      .post(`/api/workorders/${workOrderId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        timeSpentMin: 45,
        checklists: [{ description: 'Inspect housing', done: true }],
        partsUsed: [{ partId: new mongoose.Types.ObjectId().toHexString(), qty: 1, cost: 25 }],
        signatures: [{ userId: adminId }],
        photos: ['http://example.com/photo.jpg'],
        failureCode: 'NONE',
      })
      .expect(200);

    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.status).toBe('completed');

    const storedOrder = await WorkOrder.findById(workOrderId).lean();
    expect(storedOrder?.status).toBe('completed');
    expect(storedOrder?.assignees).toHaveLength(1);
    expect(storedOrder?.timeSpentMin).toBe(45);

    const summaryRes = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(summaryRes.body.success).toBe(true);
    const summaryData = summaryRes.body.data;
    expect(summaryData).toBeTruthy();
    if (summaryData?.workOrders && typeof summaryData.workOrders.total === 'number') {
      expect(summaryData.workOrders.total).toBeGreaterThanOrEqual(1);
    }

    const workOrderSummary = await request(app)
      .get('/api/summary/workorders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(workOrderSummary.body.success).toBe(true);
    const workOrderSummaryData = workOrderSummary.body.data;
    if (typeof workOrderSummaryData?.total === 'number') {
      expect(workOrderSummaryData.total).toBeGreaterThanOrEqual(1);
    }

    await request(app)
      .delete(`/api/team/${teamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app)
      .delete(`/api/departments/${departmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(await Department.countDocuments()).toBe(0);
    expect(await Line.countDocuments()).toBe(0);
    expect(await Station.countDocuments()).toBe(0);
    const remainingAssets = await Asset.find().lean();
    expect(remainingAssets.every((asset) => !asset.stationId)).toBe(true);
  });
});

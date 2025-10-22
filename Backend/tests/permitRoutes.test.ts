/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import PermitRoutes from '../routes/permitRoutes';
import WorkOrderRoutes from '../routes/workOrdersRoutes';
import User from '../models/User';
import WorkOrder from '../models/WorkOrder';
import Permit from '../models/Permit';

const app = express();
app.use(express.json());
app.use('/api/permits', PermitRoutes);
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;

const buildToken = (userId: mongoose.Types.ObjectId) =>
  jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET!);

describe('Permit routes', () => {
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
    tenantId = new mongoose.Types.ObjectId();
  });

  it('enforces approval workflow and work order readiness', async () => {
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash: 'pass',
      roles: ['admin'],
      tenantId,
      employeeId: 'EMP-A',
    });
    const supervisor = await User.create({
      name: 'Supervisor',
      email: 'supervisor@example.com',
      passwordHash: 'pass',
      roles: ['supervisor'],
      tenantId,
      employeeId: 'EMP-S',
    });
    const manager = await User.create({
      name: 'Manager',
      email: 'manager@example.com',
      passwordHash: 'pass',
      roles: ['manager'],
      tenantId,
      employeeId: 'EMP-M',
    });
    const viewer = await User.create({
      name: 'Viewer',
      email: 'viewer@example.com',
      passwordHash: 'pass',
      roles: ['viewer'],
      tenantId,
      employeeId: 'EMP-V',
    });

    const adminToken = buildToken(admin._id);
    const supervisorToken = buildToken(supervisor._id);
    const managerToken = buildToken(manager._id);
    const viewerToken = buildToken(viewer._id);

    const workOrderRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Safety Maintenance',
        priority: 'medium',
        status: 'requested',
      })
      .expect(201);

    const workOrderId = workOrderRes.body._id as string;

    const permitRes = await request(app)
      .post('/api/permits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'hot-work',
        description: 'Welding in confined space',
        requestedBy: admin._id.toString(),
        workOrder: workOrderId,
        approvalChain: [
          { user: supervisor._id.toString(), role: 'supervisor' },
          { role: 'manager' },
        ],
        isolationSteps: [
          { description: 'Verify lockout devices' },
        ],
      })
      .expect(201);

    const permitId = permitRes.body._id as string;

    const viewerAttempt = await request(app)
      .post(`/api/permits/${permitId}/approve`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ notes: 'Attempted by viewer' })
      .expect(403);

    expect(viewerAttempt.body.error).toBeDefined();

    const startDenied = await request(app)
      .post(`/api/workorders/${workOrderId}/start`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(409);
    expect(startDenied.body.error).toContain('Permits');

    await request(app)
      .post(`/api/permits/${permitId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ notes: 'Supervisor approved' })
      .expect(200);

    const permitAfterSupervisor = await Permit.findById(permitId).lean();
    expect(permitAfterSupervisor?.approvalChain[0].status).toBe('approved');
    expect(permitAfterSupervisor?.status).toBe('pending');

    await request(app)
      .post(`/api/permits/${permitId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ notes: 'Manager approved' })
      .expect(200);

    const permitApproved = await Permit.findById(permitId).lean();
    expect(permitApproved?.status).toBe('approved');

    await request(app)
      .post(`/api/workorders/${workOrderId}/start`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    const permitActive = await Permit.findById(permitId).lean();
    expect(permitActive?.status).toBe('active');

    await request(app)
      .post(`/api/workorders/${workOrderId}/complete`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(200);

    const permitClosed = await Permit.findById(permitId).lean();
    expect(permitClosed?.status).toBe('closed');

    const workOrder = await WorkOrder.findById(workOrderId).lean();
    expect(workOrder?.permits.map(String)).toContain(permitId);
    expect(workOrder?.requiredPermitTypes).toContain('hot-work');
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import workRequestsRouter from '../src/modules/work-requests';
import Tenant from '../models/Tenant';
import Site from '../models/Site';
import User from '../models/User';
import RequestForm from '../models/RequestForm';
import WorkRequest from '../models/WorkRequest';
import WorkOrder from '../models/WorkOrder';

vi.mock('../services/workflowEngine', () => ({
  applyWorkflowToRequest: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', workRequestsRouter);

let mongo: MongoMemoryServer;
const jwtSecret = 'work-requests-secret';
let tenantId: Types.ObjectId;
let siteId: Types.ObjectId;
let adminToken: string;
let technicianToken: string;
let viewerToken: string;

const createUserToken = async (roles: string[]) => {
  const primaryRole = roles[0] ?? 'viewer';
  const user = await User.create({
    name: `${primaryRole} user`,
    email: `${primaryRole}@example.com`,
    passwordHash: 'hash',
    roles,
    tenantId,
    siteId,
    active: true,
    employeeId: `EMP-${primaryRole}-${Date.now()}`,
  });
  return jwt.sign(
    { id: user._id.toString(), tenantId: tenantId.toString(), role: primaryRole, roles, siteId: siteId.toString() },
    jwtSecret,
  );
};

const seedBase = async () => {
  const tenant = await Tenant.create({ name: 'Acme' });
  tenantId = tenant._id;
  const site = await Site.create({ name: 'Plant 1', tenantId });
  siteId = site._id;
  await RequestForm.create({ slug: 'default', name: 'Default form', schema: {}, tenantId, siteId });
  adminToken = await createUserToken(['admin']);
  technicianToken = await createUserToken(['tech']);
  viewerToken = await createUserToken(['viewer']);
};

beforeAll(async () => {
  process.env.JWT_SECRET = jwtSecret;
  process.env.MONGOMS_DISTRO = 'ubuntu-22.04';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  await seedBase();
});

describe('work request routes', () => {
  it('accepts public submissions without authentication', async () => {
    const res = await request(app)
      .post('/api/public/work-requests')
      .field('formSlug', 'default')
      .field('title', 'Broken conveyor')
      .field('description', 'Main line stopped after a loud noise')
      .field('requesterName', 'Jordan')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();

    const stored = await WorkRequest.findOne({ token: res.body.data.token }).lean();
    expect(stored?.title).toBe('Broken conveyor');
    expect(stored?.tenantId?.toString()).toBe(tenantId.toString());
  });

  it('requires auth and tenant scope for listing and fetching requests', async () => {
    const token = await createUserToken(['admin']);
    const requestId = new Types.ObjectId();
    await WorkRequest.create({
      _id: requestId,
      token: 'abc123',
      title: 'Leaking pipe',
      requesterName: 'Sam',
      description: 'Pipe leaking near pump',
      tenantId,
      siteId,
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });
    await WorkRequest.create({
      token: 'other',
      title: 'Other tenant issue',
      requesterName: 'Taylor',
      tenantId: new Types.ObjectId(),
      siteId: new Types.ObjectId(),
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });

    await request(app).get('/api/work-requests').expect(401);

    const listRes = await request(app)
      .get('/api/work-requests')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(200);

    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]._id).toBe(requestId.toString());

    const detail = await request(app)
      .get(`/api/work-requests/${requestId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(200);

    expect(detail.body.data._id).toBe(requestId.toString());
  });

  it('enforces triage permissions', async () => {
    const res = await request(app)
      .get('/api/work-requests')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(403);

    expect(res.body.message ?? res.body.error).toBeDefined();
  });

  it('converts a request into a work order and links it', async () => {
    const requestRecord = await WorkRequest.create({
      token: 'convert-me',
      title: 'Replace filter',
      description: 'Filter needs replacement',
      requesterName: 'Jamie',
      tenantId,
      siteId,
      priority: 'high',
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });

    const res = await request(app)
      .post(`/api/work-requests/${requestRecord._id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId.toString())
      .send({ priority: 'critical', workOrderType: 'corrective' })
      .expect(200);

    expect(res.body.data.workOrderId).toBeTruthy();
    const updated = await WorkRequest.findById(requestRecord._id).lean();
    expect(updated?.status).toBe('converted');
    expect(updated?.workOrder?.toString()).toBe(res.body.data.workOrderId);
    const workOrder = await WorkOrder.findById(updated?.workOrder).lean();
    expect(workOrder?.requestId?.toString()).toBe(requestRecord._id.toString());
  });

  it('rejects unauthorized conversions', async () => {
    const requestRecord = await WorkRequest.create({
      token: 'no-convert',
      title: 'Check belt',
      requesterName: 'Alex',
      tenantId,
      siteId,
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });

    await request(app)
      .post(`/api/work-requests/${requestRecord._id}/convert`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(403);
  });

  it('prevents duplicate conversions and isolates tenants', async () => {
    const requestRecord = await WorkRequest.create({
      token: 'already',
      title: 'Already converted',
      requesterName: 'Pat',
      tenantId,
      siteId,
      workOrder: new Types.ObjectId(),
      status: 'converted',
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });

    await request(app)
      .post(`/api/work-requests/${requestRecord._id}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(409);

    const otherTenant = new Types.ObjectId();
    const otherRequest = await WorkRequest.create({
      token: 'other-tenant',
      title: 'Cross tenant',
      requesterName: 'Morgan',
      tenantId: otherTenant,
      siteId: new Types.ObjectId(),
      requestForm: (await RequestForm.findOne({ slug: 'default' }))?._id,
    });

    await request(app)
      .get(`/api/work-requests/${otherRequest._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(404);
  });
});

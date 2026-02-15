/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import requestsRoutes from '../routes/requests';
import Tenant from '../models/Tenant';
import Site from '../models/Site';
import RequestForm from '../models/RequestForm';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/requests', requestsRoutes);

let mongo: MongoMemoryServer | undefined;
let token = '';

beforeAll(async () => {
  process.env.MONGOMS_DISTRO = 'ubuntu-18.04';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  const tenant = await Tenant.create({ name: 'TriCo' });
  const site = await Site.create({ name: 'Plant', tenantId: tenant._id });
  const form = await RequestForm.create({ slug: 'default', schema: [], siteId: site._id, tenantId: tenant._id });
  const user = await User.create({
    name: 'Triage User',
    email: 'triage@example.com',
    passwordHash: 'hash',
    tenantId: tenant._id,
    siteId: site._id,
    roles: ['admin'],
    employeeId: `EMP-REQ-${Date.now()}`,
  });
  token = jwt.sign({ id: user._id.toString(), tenantId: tenant._id.toString(), siteId: site._id.toString() }, 'test-secret');

  // Attach helpers to request for later tests
  (global as any).requestFormId = form._id.toString();
});

describe('requests API', () => {
  it('creates a request', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Line stoppage',
        description: 'The conveyor stopped unexpectedly',
        requesterName: 'Taylor',
        requestFormId: (global as any).requestFormId,
      })
      .expect(201);

    expect(response.body.data.title).toBe('Line stoppage');
  });

  it('updates status', async () => {
    const created = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Belt replacement',
        description: 'Belt frayed',
        requesterName: 'Supervisor',
        requestFormId: (global as any).requestFormId,
      })
      .expect(201);

    const updated = await request(app)
      .patch(`/api/requests/${created.body.data._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'reviewing' })
      .expect(200);

    expect(updated.body.data.status).toBe('reviewing');
  });
});


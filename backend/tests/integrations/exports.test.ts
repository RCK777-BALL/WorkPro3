/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

import exportsRouter from '../../src/modules/exports';
import ExportJob from '../../models/ExportJob';
import Tenant from '../../models/Tenant';
import User from '../../models/User';

const app = express();
app.use(express.json());
app.use('/api/exports/v2', exportsRouter);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: string;

beforeAll(async () => {
  process.env.JWT_SECRET = 'exports-secret';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();

  const tenant = await Tenant.create({ name: 'Export Tenant' });
  tenantId = tenant._id.toString();

  const user = await User.create({
    name: 'Exporter',
    email: `exporter-${Date.now()}@example.com`,
    passwordHash: 'password',
    roles: ['admin'],
    tenantId: tenant._id,
    employeeId: `emp-${Date.now()}`,
  });

  token = jwt.sign({ id: user._id.toString(), tenantId: tenant._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

describe('export jobs', () => {
  it('queues exports and lists history', async () => {
    const createRes = await request(app)
      .post('/api/exports/v2')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'workOrders', format: 'csv' })
      .expect(201);

    expect(createRes.body.data.status).toBe('queued');

    const listRes = await request(app)
      .get('/api/exports/v2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data).toHaveLength(1);
  });

  it('downloads completed exports', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'exports-'));
    const fileName = 'workorders.csv';
    const filePath = path.join(tmpDir, fileName);
    await fs.writeFile(filePath, 'id,title\n', 'utf8');

    const job = await ExportJob.create({
      tenantId,
      type: 'workOrders',
      format: 'csv',
      status: 'completed',
      fileName,
      filePath,
      completedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/exports/v2/${job._id.toString()}/download`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.text).toContain('id,title');
  });
});

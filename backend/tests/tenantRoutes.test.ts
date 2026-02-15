/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import TenantRoutes from '../routes/TenantRoutes';

const app = express();
app.use(express.json());
app.use('/api/tenants', TenantRoutes);

let mongo: MongoMemoryServer;
let token: string;

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
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'ADMIN1',
  });
  token = jwt.sign(
    { id: admin._id.toString(), roles: admin.roles, tenantId: admin.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('Tenant Routes', () => {
  it('supports CRUD operations', async () => {
    const createRes = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tenant A' })
      .expect(201);

    const id = createRes.body.data._id;

    const listRes = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.data).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/tenants/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tenant B' })
      .expect(200);
    expect(updateRes.body.data.name).toBe('Tenant B');

    await request(app)
      .delete(`/api/tenants/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const finalList = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(finalList.body.data).toHaveLength(0);
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import VendorRoutes from '../routes/vendorRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/vendors', VendorRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'VENDOR-EMP-001',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  await User.create({
    _id: user._id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    roles: ['admin'],
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
});

describe('Vendor Routes', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/vendors').expect(401);
  });

  it('creates, fetches, and updates a vendor', async () => {
    const createRes = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Vendor1',
        phone: '123',
        email: 'vendor@example.com',
      })
      .expect(201);

    const created = createRes.body.data;
    expect(created).toMatchObject({ name: 'Vendor1', phone: '123', email: 'vendor@example.com' });

    const listRes = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listed = Array.isArray(listRes.body.data) ? listRes.body.data : listRes.body.data?.data;
    expect(Array.isArray(listed)).toBe(true);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);

    const updateRes = await request(app)
      .put(`/api/vendors/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vendor1 Updated', phone: '555-1212' })
      .expect(200);

    expect(updateRes.body.data.name).toBe('Vendor1 Updated');
    expect(updateRes.body.data.phone).toBe('555-1212');
  });

  it('returns validation errors', async () => {
    await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'missing-name' })
      .expect(400);
  });
});


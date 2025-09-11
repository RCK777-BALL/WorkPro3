/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import VendorRoutes from '../routes/VendorRoutes';
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
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);
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
    role: user.role,
    tenantId: user.tenantId,
  });
});

describe('Vendor Routes', () => {
  it('requires authentication', async () => {
    await request(app)
      .get('/api/vendors')
      .expect(401);
  });

  it('creates and fetches a vendor', async () => {
    const createRes = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Vendor1',
        contactName: 'John Doe',
        phone: '123',
        email: 'vendor@example.com',
        address: '123 Street'
      })
      .expect(201);

    const id = createRes.body._id;

    const listRes = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0]._id).toBe(id);
  });

  it('fails validation for invalid partsSupplied id', async () => {
    await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'VendorBad',
        partsSupplied: ['not-a-valid-id']
      })
      .expect(500);
  });
});


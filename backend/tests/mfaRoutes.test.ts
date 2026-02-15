/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';

import authRoutes from '../routes/AuthRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

let mongo: MongoMemoryServer;

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
});

describe('MFA Routes', () => {
  it('sets up MFA for a user and stores secret', async () => {
    const user = await User.create({
      name: 'Setup',
      email: 'setup@example.com',
      passwordHash: 'pass123',
      roles: ['planner'],
      tenantId: new mongoose.Types.ObjectId(),
      employeeId: 'EMP001',
    });

    const res = await request(app)
      .post('/api/auth/mfa/setup')
      .send({ userId: user._id.toString() })
      .expect(200);

    expect(res.body.data.secret).toBeDefined();
    expect(res.body.data.token).toBeDefined();

    const updated = await User.findById(user._id);
    expect(updated?.mfaSecret).toBe(res.body.data.secret);
    expect(updated?.mfaEnabled).toBe(false);

    const valid = speakeasy.totp.verify({
      secret: res.body.data.secret,
      encoding: 'base32',
      token: res.body.data.token,
    });
    expect(valid).toBe(true);
  });

  it('returns 404 when setting up MFA for missing user', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app)
      .post('/api/auth/mfa/setup')
      .send({ userId: fakeId })
      .expect(404);
  });

  it('verifies MFA token and enables MFA', async () => {
    const user = await User.create({
      name: 'Verify',
      email: 'verify@example.com',
      passwordHash: 'pass123',
      roles: ['planner'],
      tenantId: new mongoose.Types.ObjectId(),
      employeeId: 'EMP002',
    });

    const setup = await request(app)
      .post('/api/auth/mfa/setup')
      .send({ userId: user._id.toString() })
      .expect(200);

    const token = speakeasy.totp({
      secret: setup.body.data.secret,
      encoding: 'base32',
    });

    const res = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ userId: user._id.toString(), token })
      .expect(200);

    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.mfaEnabled).toBe(true);
    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.id).toBe(user._id.toString());

    const updated = await User.findById(user._id);
    expect(updated?.mfaEnabled).toBe(true);
  });

  it('fails verification with invalid token', async () => {
    const user = await User.create({
      name: 'Fail',
      email: 'fail@example.com',
      passwordHash: 'pass123',
      roles: ['planner'],
      tenantId: new mongoose.Types.ObjectId(),
      employeeId: 'EMP003',
    });

    const setup = await request(app)
      .post('/api/auth/mfa/setup')
      .send({ userId: user._id.toString() })
      .expect(200);

    const validToken = speakeasy.totp({
      secret: setup.body.data.secret,
      encoding: 'base32',
    });
    const invalidToken = (Number(validToken) + 1).toString().padStart(validToken.length, '0');

    await request(app)
      .post('/api/auth/mfa/verify')
      .send({ userId: user._id.toString(), token: invalidToken })
      .expect(400);

    const updated = await User.findById(user._id);
    expect(updated?.mfaEnabled).toBe(false);
  });
});

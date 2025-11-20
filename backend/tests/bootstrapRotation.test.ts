/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as speakeasy from 'speakeasy';

import User from '../models/User';
import authRoutes from '../routes/AuthRoutes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create({ binary: { version: '6.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('Bootstrap rotation', () => {
  it('blocks default credentials and allows rotation with MFA', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    await User.create({
      name: 'Bootstrap Admin',
      email: 'admin@cmms.com',
      passwordHash: 'Password123!',
      roles: ['global_admin'],
      tenantId,
      employeeId: 'EMP-1',
      passwordExpired: true,
      bootstrapAccount: true,
      mfaEnabled: false,
    });

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cmms.com', password: 'Password123!' })
      .expect(423);

    const payload = login.body as {
      data: { rotationRequired: boolean; rotationToken: string; mfaSecret: string; userId: string };
    };

    expect(payload.data.rotationRequired).toBe(true);
    expect(payload.data.rotationToken).toBeDefined();
    expect(payload.data.mfaSecret).toBeDefined();

    const token = speakeasy.totp({ secret: payload.data.mfaSecret, encoding: 'base32' });

    await request(app)
      .post('/api/auth/bootstrap/rotate')
      .send({
        rotationToken: payload.data.rotationToken,
        newPassword: 'NewPassword!1234',
        mfaToken: token,
      })
      .expect(200);

    const secondLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cmms.com', password: 'NewPassword!1234' })
      .expect(200);

    const rotationResult = secondLogin.body as { data?: { mfaRequired?: boolean; userId?: string } };
    expect(rotationResult.data?.mfaRequired).toBe(true);
  });
});


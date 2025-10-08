/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import authRoutes from '../../../backend/routes/AuthRoutes';
import User from '../../../backend/models/User';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

declare const testDb: any;

beforeAll(async () => {
  const mongoUri = (testDb as any).client.s.url as string;
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'testsecret';
  process.env.GOOGLE_CLIENT_ID = 'id';
  process.env.GOOGLE_CLIENT_SECRET = 'secret';
  await mongoose.connect(mongoUri, { dbName: 'test-db' });
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('OAuth and MFA flows', () => {
  it('handles OAuth callback', async () => {
    const res = await request(app).get('/api/auth/oauth/google/callback');
    expect(res.status).toBe(302);
    const location = res.headers['location'];
    expect(location).toMatch(/token=/);
  });

  it('verifies MFA token', async () => {
    const hashed = await bcrypt.hash('pass123', 10);
    const user = await User.create({
      name: 'MFA',
      email: 'mfa@example.com',
      password: hashed,
      role: 'admin',
      tenantId: new mongoose.Types.ObjectId(),
    });

    const gen = await request(app).post('/api/auth/mfa/setup').send({ userId: user._id.toString() });
    await User.updateOne({ _id: user._id }, { mfaEnabled: true });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mfa@example.com', password: 'pass123' });
    expect(loginRes.body.data.mfaRequired).toBe(true);
    expect(loginRes.body.data.userId).toBe(user._id.toString());

    const verifyRes = await request(app)
      .post('/api/auth/mfa/verify')
      .send({ userId: user._id.toString(), token: gen.body.token });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
  });
});

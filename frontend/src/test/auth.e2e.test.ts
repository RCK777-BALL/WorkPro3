/*
 * SPDX-License-Identifier: MIT
 */

import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import authRoutes from '../../../backend/routes/AuthRoutes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes as any);

declare const testDb: any;

beforeAll(async () => {
  const mongoUri = (testDb as any).client.s.url as string;
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'testsecret';
  await mongoose.connect(mongoUri, { dbName: 'test-db' });
});

afterAll(async () => {
  await mongoose.disconnect();
});

const email = 'user@example.com';
const password = 'pass123';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    const hashed = await bcrypt.hash(password, 10);
    await testDb.collection('users').insertOne({
      name: 'Test User',
      email,
      password: hashed,
      role: 'admin',
      tenantId: new mongoose.Types.ObjectId(),
    });
  });

  it('returns token for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    const decoded: any = jwt.verify(res.body.token, process.env.JWT_SECRET!);
    expect(decoded.tenantId).toBe(res.body.user.tenantId);
  });

  it('rejects invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'none@example.com', password });
    expect(res.status).toBe(401);
  });
});

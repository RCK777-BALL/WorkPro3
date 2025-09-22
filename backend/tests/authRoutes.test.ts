/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/AuthRoutes';

const app = express();
app.use(express.json());
app.use(cookieParser());
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

describe('Auth Routes', () => {
  it('registers a new user with hashed password', async () => {
    const password = 'pass123';

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New User',
        email: 'new@example.com',
        password,
        tenantId: new mongoose.Types.ObjectId().toString(),
        employeeId: 'EMP1',
      })
      .expect(201);

    expect(res.body.message).toBe('User registered successfully');

    const user = await User.findOne({ email: 'new@example.com' }).lean();
    expect(user).toBeTruthy();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(password);
    const match = await bcrypt.compare(password, user!.passwordHash);
    expect(match).toBe(true);
  });

  it('logs in and sets cookie', async () => {
    await User.create({
      name: 'Test',
      email: 'test@example.com',
      passwordHash: 'pass123',
      roles: ['admin'],
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass123' })
      .expect(200);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
    expect(cookies[0]).toMatch(/SameSite=Strict/);

    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.token).toBeUndefined();

    const token = cookies[0].split(';')[0].split('=')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.tenantId).toBe(res.body.user.tenantId);
  });

  it('indicates MFA is required and includes the user id', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const user = await User.create({
      name: 'MFA User',
      email: 'mfa-user@example.com',
      passwordHash: 'pass123',
      roles: ['admin'],
      tenantId,
      mfaEnabled: true,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mfa-user@example.com', password: 'pass123' })
      .expect(200);

    expect(res.body).toEqual({
      data: {
        mfaRequired: true,
        userId: user._id.toString(),
      },
      error: null,
    });
  });

  it('optionally returns token in response when enabled', async () => {
    process.env.INCLUDE_AUTH_TOKEN = 'true';
    await User.create({
      name: 'Config',
      email: 'config@example.com',
      passwordHash: 'pass123',
      roles: ['admin'],
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'config@example.com', password: 'pass123' })
      .expect(200);

    expect(res.body.token).toBeDefined();

    delete process.env.INCLUDE_AUTH_TOKEN;
  });

  it('omits token from response when INCLUDE_AUTH_TOKEN is unset', async () => {

    delete process.env.INCLUDE_AUTH_TOKEN;
    await User.create({
      name: 'NoToken',
      email: 'notoken@example.com',
      passwordHash: 'pass123',
      roles: ['admin'],
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notoken@example.com', password: 'pass123' })
      .expect(200);

    expect(res.body.token).toBeUndefined();
  });

  it('gets current user with cookie and logs out', async () => {
    await User.create({
      name: 'Me',
      email: 'me@example.com',
      passwordHash: 'pass123',
      roles: ['planner'],
      tenantId: new mongoose.Types.ObjectId(),
    });
    // login
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'me@example.com', password: 'pass123' })
      .expect(200);

    const cookies = login.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(200);
    expect(meRes.body.data.user.email).toBe('me@example.com');

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies)
      .expect(401);
  });

  it('uses secure cookies when configured', async () => {
    process.env.COOKIE_SECURE = 'true';
    await User.create({
      name: 'Secure',
      email: 'secure@example.com',
      passwordHash: 'pass123',
      roles: ['planner'],
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'secure@example.com', password: 'pass123' })
      .expect(200);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/Secure/);

    delete process.env.COOKIE_SECURE;
  });
});

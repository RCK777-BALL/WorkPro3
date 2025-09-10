import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/authRoutes';

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
  it('logs in and sets cookie', async () => {
    await User.create({
      name: 'Test',
      email: 'test@example.com',
      passwordHash: 'pass123',
      role: 'admin',
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass123' })
      .expect(200);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);

    expect(res.body.user.email).toBe('test@example.com');

    const token = cookies[0].split(';')[0].split('=')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.tenantId).toBe(res.body.user.tenantId);
  });

  it('gets current user with cookie and logs out', async () => {
    await User.create({
      name: 'Me',
      email: 'me@example.com',
      passwordHash: 'pass123',
      role: 'viewer',
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
    expect(meRes.body.email).toBe('me@example.com');

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .expect(200);
  });
});

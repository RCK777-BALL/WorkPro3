/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserRoutes from '../routes/UserRoutes';

const app = express();
app.use(express.json());
app.use('/api/users', UserRoutes);

let mongo: MongoMemoryServer;
let user: Awaited<ReturnType<typeof User.create>>;
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
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['planner'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-THEME',
  });
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('User Theme Routes', () => {
  it('updates and retrieves user theme', async () => {
    await request(app)
      .put(`/api/users/${user._id}/theme`)
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark' })
      .expect(200);

    const res = await request(app)
      .get(`/api/users/${user._id}/theme`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.theme).toBe('dark');
  });
});

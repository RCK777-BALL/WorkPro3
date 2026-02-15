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
let token: string;
let admin: Awaited<ReturnType<typeof User.create>>;

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
  admin = await User.create({
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

describe('User Routes', () => {
  it('omits password from responses', async () => {
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'User One',
        email: 'user1@example.com',
        passwordHash: 'StrongPass123!',
        roles: ['planner'],
        employeeId: 'EMP1',
      })
      .expect(201);

    expect(createRes.body.data.password).toBeUndefined();

    const userId = createRes.body.data._id;

    const listRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data[0].password).toBeUndefined();

    const getRes = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.data.password).toBeUndefined();

    const updateRes = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(updateRes.body.data.password).toBeUndefined();
  });
});


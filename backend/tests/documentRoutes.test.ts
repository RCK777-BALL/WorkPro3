/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import DocumentRoutes from '../routes/DocumentRoutes';
import User from '../models/User';
import AuditLog from '../models/AuditLog';

const app = express();
app.use(express.json());
app.use('/api/documents', DocumentRoutes);

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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('Document Routes', () => {
  it('creates an audit log on document creation', async () => {
    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Doc1', type: 'manual' })
      .expect(201);

    const logs = await AuditLog.find({ entityType: 'Document', action: 'create' });
    expect(logs.length).toBe(1);
    expect(logs[0].entityType).toBe('Document');
  });

  it('fails validation when updating with invalid enum', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Doc1', type: 'manual' })
      .expect(201);

    const id = createRes.body._id;

    await request(app)
      .put(`/api/documents/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'invalid' })
      .expect(500);
  });
});

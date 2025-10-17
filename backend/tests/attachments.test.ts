/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

import AttachmentRoutes from '../routes/AttachmentRoutes';
import WorkOrderRoutes from '../routes/workOrdersRoutes';
import User from '../models/User';
import Department from '../models/Department';

const app = express();
app.use(express.json());
app.use('/api/attachments', AttachmentRoutes);
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;
let department: Awaited<ReturnType<typeof Department.create>>;

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
  await fs.rm(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
  department = await Department.create({ name: 'Dept', tenantId: user.tenantId });
});

describe('attachments API', () => {
  it('saves base64 attachment and persists URL in work order', async () => {
    const data = Buffer.from('hello world').toString('base64');
    const res = await request(app)
      .post('/api/attachments')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'base64', filename: 'hello.txt', data, contentType: 'text/plain' })
      .expect(201);

    const url: string = res.body.data.url;
    expect(url).toMatch(new RegExp(`/static/uploads/${user.tenantId}/`));

    const woRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'With photo',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        department: department._id,
        photos: [url],
      })
      .expect(201);

    expect(woRes.body.photos).toEqual([url]);
  });

  it('accepts URL attachment and persists in work order', async () => {
    const urlInput = 'https://example.com/test.png';
    const res = await request(app)
      .post('/api/attachments')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'url', url: urlInput })
      .expect(201);

    expect(res.body.data.url).toBe(urlInput);

    const woRes = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'URL photo',
        description: 'desc',
        priority: 'medium',
        status: 'requested',
        departmentId: department._id,
        department: department._id,
        photos: [urlInput],
      })
      .expect(201);

    expect(woRes.body.photos).toEqual([urlInput]);
  });
});


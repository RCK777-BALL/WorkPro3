/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import WorkOrderRoutes from '../routes/WorkOrderRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/workorders', WorkOrderRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

describe('Work Order CRUD and transitions', () => {
  it('persists structured subdocuments', async () => {
    const partId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'WO',
        priority: 'medium',
        checklists: [{ description: 'c1', completed: false }],
        partsUsed: [{ partId, quantity: 2 }],
        signatures: [{ userId: user._id }],
      })
      .expect(201);

    expect(res.body.checklists[0].description).toBe('c1');
    expect(res.body.partsUsed[0].partId).toBe(partId.toString());
    expect(res.body.signatures[0].userId).toBe(user._id.toString());

    const fetch = await request(app)
      .get(`/api/workorders/${res.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(fetch.body.checklists.length).toBe(1);
    expect(fetch.body.partsUsed[0].quantity).toBe(2);
  });

  it('updates status and signatures through transitions', async () => {
    const create = await request(app)
      .post('/api/workorders')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Trans', priority: 'low' })
      .expect(201);
    const id = create.body._id;

    await request(app)
      .post(`/api/workorders/${id}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assignees: [user._id] })
      .expect(200);

    await request(app)
      .post(`/api/workorders/${id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const complete = await request(app)
      .post(`/api/workorders/${id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ signatures: [{ userId: user._id }] })
      .expect(200);
    expect(complete.body.status).toBe('completed');
    expect(complete.body.signatures.length).toBe(1);

    const cancel = await request(app)
      .post(`/api/workorders/${id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancel.body.status).toBe('cancelled');
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import VideoRoutes from '../routes/VideoRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/videos', VideoRoutes);

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
    name: 'Video Tester',
    email: 'video@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
});

describe('Video Routes serialization', () => {
  it('returns lean objects for list and detail responses', async () => {
    const createRes = await request(app)
      .post('/api/videos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Video',
        type: 'training',
        videoUrl: 'https://example.com/video.mp4',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const created = createRes.body.data;
    expect(created.title).toBe('Test Video');

    const listRes = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    const listItem = listRes.body.data[0];
    expect(listItem.title).toBe('Test Video');
    expect(typeof listItem.toObject).toBe('undefined');
    expect(listItem._id).toBe(created._id);

    const detailRes = await request(app)
      .get(`/api/videos/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data._id).toBe(created._id);
    expect(detailRes.body.data.title).toBe('Test Video');
    expect(typeof detailRes.body.data.toObject).toBe('undefined');
  });

  it('returns 404 for missing video', async () => {
    const missingId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/videos/${missingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('Not found');
  });
});

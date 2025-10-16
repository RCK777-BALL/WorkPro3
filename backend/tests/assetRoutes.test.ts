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
import AssetRoutes from '../routes/assetRoutes';
import Asset from '../models/Asset';

const app = express();
app.use(express.json());
app.use('/api/assets', AssetRoutes);

let mongo: MongoMemoryServer;
let token: string;

// Store the created user so the JWT contains a valid id
let user: any;

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

describe('Asset Routes', () => {
  it('creates and fetches assets', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Asset',
        type: 'Mechanical',
        location: 'Area 1',
        status: 'Active'
      })
      .expect(201);

    const id = createRes.body._id;

    const listRes = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0]._id).toBe(id);
    expect(listRes.body[0].name).toBe('Test Asset');
  });

  it('fails validation when required fields are missing', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('fails validation when updating with invalid data', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AssetForUpdate',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(201);

    const id = createRes.body._id;

    await request(app)
      .put(`/api/assets/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('rejects invalid file types before controller', async () => {
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Bad File')
      .field('type', 'Mechanical')
      .field('location', 'Area 1')
      .attach('file', Buffer.from('test'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rejects files exceeding size limit', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
    await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Big File')
      .field('type', 'Mechanical')
      .field('location', 'Area 1')
      .attach('file', bigBuffer, {
        filename: 'big.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('returns 400 for invalid asset id', async () => {
    await request(app)
      .get('/api/assets/invalid-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('updates and deletes an asset', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Asset1',
        type: 'Mechanical',
        location: 'Area 1',
        status: 'Active'
      })
      .expect(201);

    const id = createRes.body._id;

    const updateRes = await request(app)
      .put(`/api/assets/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Asset',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(200);

    expect(updateRes.body.name).toBe('Updated Asset');

    await request(app)
      .delete(`/api/assets/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfter = await request(app)
      .get('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listAfter.body.length).toBe(0);
  });

  it('creates asset using tenant id from JWT', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'JWT Tenant Asset',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(201);

    expect(res.body.tenantId).toBe(user.tenantId.toString());
  });

  it('ignores tenant id in request body and uses authenticated tenant', async () => {
    const otherTenant = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Body Tenant Asset',
        type: 'Mechanical',
        location: 'Area 1',
        tenantId: otherTenant,
      })
      .expect(201);

    expect(res.body.tenantId).toBe(user.tenantId.toString());
  });

  it('searches assets within tenant only', async () => {
    const asset1 = await Asset.create({
      name: 'SharedName',
      type: 'Mechanical',
      location: 'Area 1',
      tenantId: user.tenantId,
    });
    await Asset.create({
      name: 'SharedName',
      type: 'Mechanical',
      location: 'Area 2',
      tenantId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .get('/api/assets/search?q=SharedName')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(asset1._id.toString());
  });

});

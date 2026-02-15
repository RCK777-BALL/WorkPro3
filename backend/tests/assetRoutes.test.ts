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
// @ts-ignore: module '../routes/AssetRoutes' has no declaration file
import AssetRoutes from '../routes/AssetRoutes';
import Asset from '../models/Asset';
import Site from '../models/Site';

const app = express();
app.use(express.json());
app.use('/api/assets', AssetRoutes);

let mongo: MongoMemoryServer;
let token: string;
let site: Awaited<ReturnType<typeof Site.create>>;

// Store the created user so the JWT contains a valid id
let user: any;
const authHeaders = () => ({ Authorization: `Bearer ${token}`, 'x-site-id': site._id.toString() });

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
  const createdUser = new User({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['admin'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'EMP-1',
  });
  await createdUser.save();
  user = createdUser;

  site = await Site.create({
    tenantId: user.tenantId,
    name: 'Asset Site',
    slug: `asset-${Date.now()}`,
  });

  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString(), siteId: site._id.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('Asset Routes', () => {
  it('creates and fetches assets', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({
        name: 'Test Asset',
        type: 'Mechanical',
        location: 'Area 1',
        status: 'Active'
      })
      .expect(201);

    const id = createRes.body.data._id;

    const listRes = await request(app)
      .get('/api/assets')
      .set(authHeaders())
      .expect(200);

    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0]._id).toBe(id);
    expect(listRes.body.data[0].name).toBe('Test Asset');
  });

  it('fails validation when required fields are missing', async () => {
    await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({})
      .expect(400);
  });

  it('fails validation when updating with invalid data', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({
        name: 'AssetForUpdate',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(201);

    const id = createRes.body.data._id;

    await request(app)
      .put(`/api/assets/${id}`)
      .set(authHeaders())
      .send({})
      .expect(400);
  });

  it('rejects invalid file types before controller', async () => {
    await request(app)
      .post('/api/assets')
      .set(authHeaders())
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
      .set(authHeaders())
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
      .set(authHeaders())
      .expect(400);
  });

  it('updates and deletes an asset', async () => {
    const createRes = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({
        name: 'Asset1',
        type: 'Mechanical',
        location: 'Area 1',
        status: 'Active'
      })
      .expect(201);

    const id = createRes.body.data._id;

    const updateRes = await request(app)
      .put(`/api/assets/${id}`)
      .set(authHeaders())
      .send({
        name: 'Updated Asset',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(200);

    expect(updateRes.body.data.name).toBe('Updated Asset');

    await request(app)
      .delete(`/api/assets/${id}`)
      .set(authHeaders())
      .expect(200);

    const listAfter = await request(app)
      .get('/api/assets')
      .set(authHeaders())
      .expect(200);

    expect(listAfter.body.data.length).toBe(0);
  });

  it('creates asset using tenant id from JWT', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({
        name: 'JWT Tenant Asset',
        type: 'Mechanical',
        location: 'Area 1',
      })
      .expect(201);

    expect(res.body.data.tenantId).toBe(user.tenantId.toString());
  });

  it('rejects cross-tenant id in request body', async () => {
    const otherTenant = new mongoose.Types.ObjectId().toString();
    await request(app)
      .post('/api/assets')
      .set(authHeaders())
      .send({
        name: 'Body Tenant Asset',
        type: 'Mechanical',
        location: 'Area 1',
        tenantId: otherTenant,
      })
      .expect(403);
  });

  it('searches assets within tenant only', async () => {
    const asset1 = await Asset.create({
      name: 'SharedName',
      type: 'Mechanical',
      location: 'Area 1',
      tenantId: user.tenantId,
      plant: site._id,
      siteId: site._id,
    });
    await Asset.create({
      name: 'SharedName',
      type: 'Mechanical',
      location: 'Area 2',
      tenantId: new mongoose.Types.ObjectId(),
      plant: new mongoose.Types.ObjectId(),
      siteId: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .get('/api/assets/search?q=SharedName')
      .set(authHeaders())
      .expect(200);

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]._id).toBe(asset1._id.toString());
  });

});

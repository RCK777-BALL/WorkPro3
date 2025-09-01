import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import User from '../../models/User';
import Role from '../../models/Role';
import { requireAuth } from '../../middleware/authMiddleware';
import authorize from '../../middleware/authorize';

const app = express();
app.use(express.json());
app.get('/protected', requireAuth, authorize('perm:test'), (_req, res) => {
  res.json({ ok: true });
});

let mongo: MongoMemoryServer;
let tokenWith: string;
let tokenWithout: string;

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

  await Role.create({ name: 'with', permissions: ['perm:test'] });
  await Role.create({ name: 'without', permissions: [] });

  const userWith = await User.create({
    name: 'With Perm',
    email: 'with@example.com',
    password: 'pass123',
    role: 'with',
    tenantId: new mongoose.Types.ObjectId(),
  });
  tokenWith = jwt.sign({ id: userWith._id.toString() }, process.env.JWT_SECRET!);

  const userWithout = await User.create({
    name: 'No Perm',
    email: 'without@example.com',
    password: 'pass123',
    role: 'without',
    tenantId: new mongoose.Types.ObjectId(),
  });
  tokenWithout = jwt.sign({ id: userWithout._id.toString() }, process.env.JWT_SECRET!);
});

describe('authorize middleware', () => {
  it('allows access when permission is present', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenWith}`)
      .expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('denies access when permission is missing', async () => {
    await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenWithout}`)
      .expect(403);
  });
});

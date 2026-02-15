/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { requirePermission } from '../src/auth/permissions';
import User from '../models/User';
import Role from '../models/Role';
import UserRoleAssignment from '../models/UserRoleAssignment';

const app = express();
app.use(express.json());

app.post('/secure-action', requireAuth, tenantScope, requirePermission('inventory', 'manage'), (_req, res) => {
  res.json({ ok: true });
});

let mongo: MongoMemoryServer;
let tenantId: mongoose.Types.ObjectId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.MONGOMS_VERSION = '6.0.5';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  tenantId = new mongoose.Types.ObjectId();
});

describe('requirePermission middleware', () => {
  it('allows requests when user has the required permission for the tenant', async () => {
    const user = await User.create({
      name: 'Permitted User',
      email: 'permitted@example.com',
      passwordHash: 'pass123',
      roles: ['admin'],
      tenantId,
      employeeId: 'EMP-PERM-ALLOW',
    });

    const role = await Role.create({ name: 'inventory_manager', permissions: ['inventory.manage'] });

    await UserRoleAssignment.create({
      userId: user._id,
      roleId: role._id,
      tenantId,
      siteId: null,
    });

    const token = jwt.sign(
      { id: user._id.toString(), tenantId: tenantId.toString(), roles: user.roles },
      process.env.JWT_SECRET!,
    );

    const res = await request(app)
      .post('/secure-action')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(200);

    expect(res.body.ok).toBe(true);
  });

  it('blocks requests when permission is missing', async () => {
    const user = await User.create({
      name: 'Limited User',
      email: 'limited@example.com',
      passwordHash: 'pass123',
      roles: ['tech'],
      tenantId,
      employeeId: 'EMP-PERM-DENY',
    });

    const token = jwt.sign(
      { id: user._id.toString(), tenantId: tenantId.toString(), roles: user.roles },
      process.env.JWT_SECRET!,
    );

    await request(app)
      .post('/secure-action')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .expect(403);
  });
});

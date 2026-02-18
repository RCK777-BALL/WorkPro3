/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { requirePermission } from '../src/auth/permissions';
import User from '../models/User';
import Role from '../models/Role';
import UserRoleAssignment from '../models/UserRoleAssignment';
import PermissionChangeLog from '../models/PermissionChangeLog';
import { updateRole } from '../controllers/RoleController';

const app = express();
app.use(express.json());
app.use(requireAuth);
app.use(tenantScope);
app.use((req, _res, next) => {
  if (req.header('x-department-id')) {
    req.departmentId = req.header('x-department-id') ?? undefined;
  }
  next();
});

app.post('/assets', requirePermission('assets', 'write'), (_req, res) => res.json({ ok: true }));
app.post('/workorders', requirePermission('workorders', 'approve'), (_req, res) => res.json({ ok: true }));
app.post('/inventory', requirePermission('inventory', 'manage'), (_req, res) => res.json({ ok: true }));
app.post('/reports', requirePermission('reports', 'export'), (_req, res) => res.json({ ok: true }));

const adminApp = express();
adminApp.use(express.json());
adminApp.put('/roles/:id', (req, _res, next) => {
  req.tenantId = req.header('x-tenant-id') ?? undefined;
  req.user = { id: req.header('x-user-id') ?? undefined } as any;
  next();
}, updateRole);

let mongo: MongoMemoryServer;
let tenantId: Types.ObjectId;
let siteId: Types.ObjectId;
let userId: Types.ObjectId;

const createToken = () =>
  jwt.sign(
    { id: userId.toString(), tenantId: tenantId.toString(), siteId: siteId.toString(), roles: ['viewer'] },
    process.env.JWT_SECRET!,
  );

beforeAll(async () => {
  process.env.JWT_SECRET = 'secret';
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
  tenantId = new Types.ObjectId();
  siteId = new Types.ObjectId();
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'password',
    tenantId,
    siteId,
    roles: ['viewer'],
    employeeId: 'EMP-PERM-INHERIT',
  });
  userId = user._id;
});

describe('permission inheritance and logging', () => {
  it('honors inherited permissions across contexts', async () => {
    await Role.create({
      tenantId,
      siteId,
      name: 'asset_coordinator',
      permissions: ['assets.write'],
    });
    const supervisor = await Role.create({
      tenantId,
      siteId,
      name: 'site_supervisor',
      permissions: ['workorders.approve'],
      inheritsFrom: ['asset_coordinator'],
    });

    await UserRoleAssignment.create({ userId, roleId: supervisor._id, tenantId, siteId });

    const token = createToken();

    const assetResponse = await request(app)
      .post('/assets')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .set('x-site-id', siteId.toString())
      .expect(200);

    expect(assetResponse.body.ok).toBe(true);

    const workorderResponse = await request(app)
      .post('/workorders')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .set('x-site-id', siteId.toString())
      .expect(200);

    expect(workorderResponse.body.ok).toBe(true);
  });

  it('rejects inventory manage when only department-scoped role is assigned', async () => {
    const departmentId = new Types.ObjectId();
    const otherDepartmentId = new Types.ObjectId();
    const departmentRole = await Role.create({
      tenantId,
      siteId,
      departmentId,
      name: 'department_tech',
      permissions: ['inventory.manage'],
    });

    await UserRoleAssignment.create({ userId, roleId: departmentRole._id, tenantId, siteId, departmentId });

    const token = createToken();

    await request(app)
      .post('/inventory')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .set('x-site-id', siteId.toString())
      .set('x-department-id', departmentId.toString())
      .expect(403);

    await request(app)
      .post('/inventory')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .set('x-site-id', siteId.toString())
      .set('x-department-id', otherDepartmentId.toString())
      .expect(403);
  });

  it('records permission delta logs when roles change', async () => {
    const role = await Role.create({
      tenantId,
      name: 'report_builder',
      permissions: ['reports.read', 'reports.build'],
    });

    await request(adminApp)
      .put(`/roles/${role._id.toString()}`)
      .set('x-tenant-id', tenantId.toString())
      .set('x-user-id', userId.toString())
      .send({ permissions: ['reports.read', 'reports.build', 'reports.export'] })
      .expect(200);

    const log = await PermissionChangeLog.findOne({ roleId: role._id });
    expect(log).toBeTruthy();
    expect(log?.delta.added).toContain('reports.export');
    expect(log?.delta.removed).toEqual([]);
    expect(log?.actor?.id?.toString()).toBe(userId.toString());
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';

import adminRoutes from '../routes/adminRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

let mongo: MongoMemoryServer;

const signFor = (user: { _id: mongoose.Types.ObjectId; tenantId: mongoose.Types.ObjectId; roles: string[] }) =>
  jwt.sign(
    { id: user._id.toString(), tenantId: user.tenantId.toString(), role: user.roles[0], roles: user.roles },
    process.env.JWT_SECRET!,
  );

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
});

describe('Admin users routes', () => {
  it('blocks non-admin from creating users', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const nonAdmin = await User.create({
      name: 'Planner User',
      email: 'planner@example.com',
      passwordHash: 'Pass123456!',
      roles: ['planner'],
      tenantId,
      employeeId: 'P-001',
    });
    const token = signFor(nonAdmin as any);

    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .send({
        fullName: 'New Tech',
        email: 'tech.new@example.com',
        trade: 'Electrical',
        employeeNumber: 'E-100',
        startDate: '2026-02-18',
        role: 'team_member',
        mode: 'temp_password',
        tempPassword: 'StrongPass123!',
      })
      .expect(403);
  });

  it('returns 409 for duplicate email', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'Pass123456!',
      roles: ['admin'],
      tenantId,
      employeeId: 'A-001',
    });
    await User.create({
      name: 'Existing Member',
      email: 'duplicate@example.com',
      passwordHash: 'Pass123456!',
      roles: ['team_member'],
      tenantId,
      employeeId: 'E-200',
      employeeNumber: 'E-200',
    });

    const token = signFor(admin as any);

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .send({
        fullName: 'Second Member',
        email: 'DUPLICATE@example.com',
        trade: 'Mechanical',
        employeeNumber: 'E-201',
        startDate: '2026-02-18',
        role: 'team_member',
        mode: 'temp_password',
        tempPassword: 'StrongPass123!',
      })
      .expect(409);

    expect(res.body.message).toContain('Email already exists');
  });

  it('returns 409 for duplicate employee number', async () => {
    const tenantId = new mongoose.Types.ObjectId();
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'Pass123456!',
      roles: ['admin'],
      tenantId,
      employeeId: 'A-001',
    });
    await User.create({
      name: 'Existing Member',
      email: 'existing@example.com',
      passwordHash: 'Pass123456!',
      roles: ['team_member'],
      tenantId,
      employeeId: 'E-300',
      employeeNumber: 'E-300',
    });

    const token = signFor(admin as any);

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId.toString())
      .send({
        fullName: 'Second Member',
        email: 'unique@example.com',
        trade: 'Mechanical',
        employeeNumber: 'E-300',
        startDate: '2026-02-18',
        role: 'team_member',
        mode: 'temp_password',
        tempPassword: 'StrongPass123!',
      })
      .expect(409);

    expect(res.body.message).toContain('Employee number already exists');
  });
});


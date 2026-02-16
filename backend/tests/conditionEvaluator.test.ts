/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import conditionRuleRoutes from '../routes/ConditionRuleRoutes';
import { evaluateCondition } from '../workers/conditionEvaluator';
import User from '../models/User';
import Asset from '../models/Asset';
import WorkOrder from '../models/WorkOrder';
import ConditionRule from '../models/ConditionRule';

const app = express();
app.use(express.json());
app.use('/api/condition-rules', conditionRuleRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;
let asset: Awaited<ReturnType<typeof Asset.create>>;

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
    employeeId: 'EMP001',
  });
  token = jwt.sign({ id: user._id.toString(), roles: user.roles }, process.env.JWT_SECRET!);
  asset = await Asset.create({
    name: 'A1',
    type: 'Mechanical',
    location: 'Loc1',
    tenantId: user.tenantId,
    plant: new mongoose.Types.ObjectId(),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  await User.create({
    _id: user._id,
    name: user.name,
    email: user.email,
    passwordHash: 'pass123',
    roles: user.roles,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
  asset = await Asset.create({
    _id: asset._id,
    name: 'A1',
    type: 'Mechanical',
    location: 'Loc1',
    tenantId: user.tenantId,
    plant: new mongoose.Types.ObjectId(),
  });
});

describe('Condition rules', () => {
  it('creates work order when threshold exceeded', async () => {
    await ConditionRule.create({
      asset: asset._id,
      metric: 'temp',
      operator: '>',
      threshold: 50,
      workOrderTitle: 'Check temp',
      tenantId: user.tenantId,
      active: true,
    });

    await evaluateCondition({
      asset: asset._id.toString(),
      metric: 'temp',
      value: 55,
      tenantId: user.tenantId.toString(),
    });
    expect(await WorkOrder.countDocuments()).toBe(1);

    await evaluateCondition({
      asset: asset._id.toString(),
      metric: 'temp',
      value: 45,
      tenantId: user.tenantId.toString(),
    });
    expect(await WorkOrder.countDocuments()).toBe(1);
  });

  it('respects updated thresholds', async () => {
    const createRes = await request(app)
      .post('/api/condition-rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        asset: asset._id.toString(),
        metric: 'vibration',
        operator: '>',
        threshold: 40,
        workOrderTitle: 'Check vib',
        active: true,
      })
      .expect(201);

    const ruleId = (createRes.body.data ?? createRes.body)._id;

    await evaluateCondition({
      asset: asset._id.toString(),
      metric: 'vibration',
      value: 45,
      tenantId: user.tenantId.toString(),
    });
    expect(await WorkOrder.countDocuments()).toBe(1);

    await request(app)
      .put(`/api/condition-rules/${ruleId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        asset: asset._id.toString(),
        metric: 'vibration',
        operator: '>',
        threshold: 60,
        workOrderTitle: 'Check vib',
        active: true,
      })
      .expect(200);

    await evaluateCondition({
      asset: asset._id.toString(),
      metric: 'vibration',
      value: 55,
      tenantId: user.tenantId.toString(),
    });
    expect(await WorkOrder.countDocuments()).toBe(1);

    await evaluateCondition({
      asset: asset._id.toString(),
      metric: 'vibration',
      value: 65,
      tenantId: user.tenantId.toString(),
    });
    expect(await WorkOrder.countDocuments()).toBe(2);
  });
});

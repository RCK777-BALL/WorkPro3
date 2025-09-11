/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import calendarRoutes from '../routes/CalendarRoutes';
import WorkOrder from '../models/WorkOrder';

const app = express();
app.use(express.json());
app.use('/api/calendar', calendarRoutes);

let mongo: MongoMemoryServer;

beforeAll(async () => {
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

describe('Calendar Routes', () => {
  it('returns events with dates', async () => {
    await WorkOrder.create({
      title: 'WO',
      tenantId: new mongoose.Types.ObjectId(),
      dueDate: new Date('2024-01-01T00:00:00Z'),
    });

    const res = await request(app).get('/api/calendar').expect(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('WO');
    expect(new Date(res.body[0].date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });
});

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import AnalyticsRoutes from '../routes/AnalyticsRoutes';
import WorkOrder from '../models/WorkOrder';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/v1/analytics', AnalyticsRoutes);

let mongo: MongoMemoryServer;
let token: string;
let tenantId: mongoose.Types.ObjectId;
let base: Date;

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
  const user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    password: 'pass123',
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  tenantId = user.tenantId;
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);

  base = new Date('2023-01-01T00:00:00Z');
  await WorkOrder.create({
    title: 'WO1',
    status: 'completed',
    tenantId,
    createdAt: base,
    dateCreated: base,
    completedAt: new Date(base.getTime() + 10 * 36e5),
  });
  await WorkOrder.create({
    title: 'WO2',
    status: 'completed',
    tenantId,
    createdAt: new Date(base.getTime() + 20 * 36e5),
    dateCreated: new Date(base.getTime() + 20 * 36e5),
    completedAt: new Date(base.getTime() + 30 * 36e5),
  });
  await WorkOrder.create({
    title: 'WO3',
    status: 'open',
    tenantId,
    createdAt: base,
    dateCreated: base,
  });
});

function binaryParser(res: any, callback: any) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => { data += chunk; });
  res.on('end', () => callback(null, Buffer.from(data, 'binary')));
}

describe('Analytics KPIs', () => {
  it('calculates MTTR, MTBF and backlog', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/kpis')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const expectedMttr =
      ((new Date(base.getTime() + 10 * 36e5).getTime() - base.getTime()) +
        (new Date(base.getTime() + 30 * 36e5).getTime() -
          new Date(base.getTime() + 20 * 36e5).getTime())) /
      2 /
      36e5;
    const expectedMtbf =
      (new Date(base.getTime() + 20 * 36e5).getTime() - base.getTime()) /
      36e5;
    expect(res.body.mttr).toBeCloseTo(expectedMttr, 1);
    expect(res.body.mtbf).toBeCloseTo(expectedMtbf, 1);
    expect(res.body.backlog).toBe(1);
  });

  it('exports CSV, XLSX and PDF', async () => {
    const csvRes = await request(app)
      .get('/api/v1/analytics/kpis.csv')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('mttr');

    const xlsxRes = await request(app)
      .get('/api/v1/analytics/kpis.xlsx')
      .set('Authorization', `Bearer ${token}`)
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(xlsxRes.headers['content-type']).toContain('spreadsheet');
    expect(xlsxRes.body.length).toBeGreaterThan(0);

    const pdfRes = await request(app)
      .get('/api/v1/analytics/kpis.pdf')
      .set('Authorization', `Bearer ${token}`)
      .buffer()
      .parse(binaryParser)
      .expect(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');
  });
});


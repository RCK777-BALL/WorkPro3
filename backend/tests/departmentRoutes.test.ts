/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express, { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import DepartmentRoutes from '../routes/DepartmentRoutes';
import User, { type UserDocument } from '../models/User';
import Asset from '../models/Asset';

const app = express();
app.use(express.json());

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'JWT secret not configured' });
  }
  try {
    const token = header.split(' ')[1];
    const { id, roles, tenantId } = jwt.verify(token, secret) as {
      id: string;
      roles: string[];
      tenantId: string;
    };
    (req as any).user = { id, roles, tenantId };
    (req as any).tenantId = tenantId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

app.use('/api/departments', authMiddleware, DepartmentRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: UserDocument;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = (await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  })) as unknown as UserDocument;
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  user = (await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    passwordHash: 'pass123',
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
  })) as unknown as UserDocument;
  token = jwt.sign(
    { id: user._id.toString(), roles: user.roles, tenantId: user.tenantId.toString() },
    process.env.JWT_SECRET!,
  );
});

describe('Department Routes', () => {
  it('creates a department with nested hierarchy', async () => {
    const payload = {
      name: 'Production',
      lines: [
        {
          name: 'Line1',
          stations: [
            {
              name: 'Station1'
            },
            {
              name: 'Station2'
            }
          ]
        },
        {
          name: 'Line2',
          stations: [
            {
              name: 'Station3'
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body.name).toBe(payload.name);
    expect(res.body.lines.length).toBe(payload.lines.length);
    payload.lines.forEach((line, i) => {
      const rLine = res.body.lines[i];
      expect(rLine.name).toBe(line.name);
      expect(rLine.stations.length).toBe(line.stations.length);
      line.stations.forEach((station, j) => {
        const rStation = rLine.stations[j];
        expect(rStation.name).toBe(station.name);
      });
    });
  });

  it('fails validation when updating with invalid data', async () => {
    const createRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept1' })
      .expect(201);

    const id = createRes.body._id;

    await request(app)
      .put(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' })
      .expect(400);
  });

  it('updates and deletes a department', async () => {
    const createRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept1' })
      .expect(201);

    const id = createRes.body._id;

    const updateRes = await request(app)
      .put(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Dept' })
      .expect(200);

    expect(updateRes.body.name).toBe('Updated Dept');

    await request(app)
      .delete(`/api/departments/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfter = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listAfter.body.length).toBe(0);
  });

  it('returns 500 when JWT secret is missing', async () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
    process.env.JWT_SECRET = original;
  });

  it('manages lines and stations within a department', async () => {
    const deptRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept1' })
      .expect(201);

    const deptId = deptRes.body._id;

    const lineRes = await request(app)
      .post(`/api/departments/${deptId}/lines`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LineA' })
      .expect(200);

    expect(lineRes.body.lines.length).toBe(1);
    const lineId = lineRes.body.lines[0]._id;

    const stationRes = await request(app)
      .post(`/api/departments/${deptId}/lines/${lineId}/stations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'StationA' })
      .expect(200);

    expect(stationRes.body.lines[0].stations.length).toBe(1);
    const stationId = stationRes.body.lines[0].stations[0]._id;

    const stationUpdate = await request(app)
      .put(
        `/api/departments/${deptId}/lines/${lineId}/stations/${stationId}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'StationA2' })
      .expect(200);
    expect(stationUpdate.body.lines[0].stations[0].name).toBe('StationA2');

    const lineUpdate = await request(app)
      .put(`/api/departments/${deptId}/lines/${lineId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'LineB' })
      .expect(200);
    expect(lineUpdate.body.lines[0].name).toBe('LineB');

    const stationDelete = await request(app)
      .delete(
        `/api/departments/${deptId}/lines/${lineId}/stations/${stationId}`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stationDelete.body.lines[0].stations.length).toBe(0);

    const lineDelete = await request(app)
      .delete(`/api/departments/${deptId}/lines/${lineId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(lineDelete.body.lines.length).toBe(0);
  });

  it('lists departments with asset counts', async () => {
    const dept = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dept1' })
      .then((r) => r.body);

    await Asset.create({
      name: 'A1',
      type: 'Electrical',
      location: 'Loc',
      departmentId: dept._id,
      tenantId: user.tenantId,
    });
    await Asset.create({
      name: 'A2',
      type: 'Electrical',
      location: 'Loc',
      departmentId: dept._id,
      tenantId: user.tenantId,
    });

    const res = await request(app)
      .get('/api/departments?assetCount=true')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body[0].assetCount).toBe(2);
  });
});

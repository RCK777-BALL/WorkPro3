import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import DepartmentRoutes from '../routes/DepartmentRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/departments', DepartmentRoutes);

let mongo: MongoMemoryServer;
let token: string;
let user: Awaited<ReturnType<typeof User.create>>;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  user = await User.create({
    name: 'Tester',
    email: 'tester@example.com',
    password: 'pass123',
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);
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
    password: 'pass123',
    role: 'manager',
    tenantId: new mongoose.Types.ObjectId(),
  });
  token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET!);
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
});

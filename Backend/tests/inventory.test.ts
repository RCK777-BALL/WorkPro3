import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import InventoryItemRoutes from '../routes/InventoryItemRoutes';
import InventoryItem from '../models/InventoryItem';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/inventory', InventoryItemRoutes);

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
});

describe('Inventory Routes', () => {
  it('creates an inventory item', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bolt', quantity: 10, tenantId: user.tenantId.toString() })
      .expect(201);

    expect(res.body.name).toBe('Bolt');

    const count = await InventoryItem.countDocuments();
    expect(count).toBe(1);
  });

  it('lists inventory items', async () => {
    await InventoryItem.create({ name: 'Item1', quantity: 5, tenantId: new mongoose.Types.ObjectId() });
    await InventoryItem.create({ name: 'Item2', quantity: 3, tenantId: new mongoose.Types.ObjectId() });

    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBeDefined();
  });
});

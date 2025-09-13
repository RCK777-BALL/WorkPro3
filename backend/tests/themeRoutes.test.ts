/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import ThemeRoutes from '../routes/ThemeRoutes';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/theme', ThemeRoutes);

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
    passwordHash: 'pass123',
    roles: ['planner']
  });
  token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET!);
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
    passwordHash: 'pass123',
    roles: ['planner'],
    theme: 'light',
    colorScheme: 'default'
  });
  token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET!);
});

describe('Theme Routes', () => {
  it('gets and updates theme', async () => {
    const getRes = await request(app)
      .get('/api/theme')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getRes.body.theme).toBe('light');

    const updateRes = await request(app)
      .put('/api/theme')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark', colorScheme: 'teal' })
      .expect(200);
    expect(updateRes.body.theme).toBe('dark');
    expect(updateRes.body.colorScheme).toBe('teal');
  });
});

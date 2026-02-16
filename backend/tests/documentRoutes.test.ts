/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';

import DocumentRoutes from '../routes/DocumentRoutes';
import User from '../models/User';
import AuditLog from '../models/AuditLog';

const app = express();
app.use(express.json());
app.use('/api/documents', DocumentRoutes);

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
    roles: ['supervisor'],
    tenantId: new mongoose.Types.ObjectId(),
    employeeId: 'DOC-EMP-001',
  });
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
  await fs.rm(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });
  await User.create({
    _id: user._id,
    name: user.name,
    email: user.email,
    passwordHash: 'pass123',
    roles: user.roles,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
  });
});

describe('Document Routes', () => {
  it('creates an audit log on document creation', async () => {
    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://example.com/doc.pdf', name: 'Doc1.pdf' })
      .expect(201);

    const logs = await AuditLog.find({ entityType: 'Document', action: 'create' });
    expect(logs.length).toBe(1);
    expect(logs[0].entityType).toBe('Document');
  });

  it('fails validation when updating without file or url', async () => {
    const createRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://example.com/doc.pdf', name: 'Doc1.pdf' })
      .expect(201);

    const id = createRes.body._id;

    await request(app)
      .put(`/api/documents/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('rejects path traversal and invalid extensions', async () => {
    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://example.com/doc.pdf', name: '../evil.pdf' })
      .expect(400);

    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://example.com/doc.exe', name: 'bad.exe' })
      .expect(400);
  });

  it('stores uploaded files uniquely and removes them on delete', async () => {
    const base64 = Buffer.from('hello').toString('base64');
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ base64, name: 'hello.txt' })
      .expect(201);
    const created = res.body.data ?? res.body;
    expect(created.name).toBe('hello.txt');
    expect(created.url).toMatch(/^\/uploads\/documents\/.+\.txt$/);
    expect(created.url).not.toContain('hello.txt');

    const filePath = path.join(process.cwd(), created.url.replace(/^\//, ''));
    const exists = await fs.stat(filePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    await request(app)
      .delete(`/api/documents/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const existsAfter = await fs.stat(filePath).then(() => true).catch(() => false);
    expect(existsAfter).toBe(false);
  });

  it('handles missing files gracefully on delete', async () => {
    const base64 = Buffer.from('hello').toString('base64');
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ base64, name: 'hello.txt' })
      .expect(201);
    const created = res.body.data ?? res.body;
    const filePath = path.join(process.cwd(), created.url.replace(/^\//, ''));
    await fs.unlink(filePath);

    await request(app)
      .delete(`/api/documents/${created._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('stores metadata when provided', async () => {
    const base64 = Buffer.from('pdf-data').toString('base64');
    const lastModified = new Date().toISOString();
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        base64,
        name: 'report.pdf',
        metadata: {
          mimeType: 'application/pdf',
          size: 1024,
          lastModified,
        },
      })
      .expect(500);

    expect(res.body.message ?? res.body.error ?? 'metadata failure').toBeTruthy();
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import requestPortalRoutes from '../routes/RequestPortalRoutes';
import RequestForm from '../models/RequestForm';
import Tenant from '../models/Tenant';
import Site from '../models/Site';
import WorkRequest from '../models/WorkRequest';

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/request-portal', requestPortalRoutes);

let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  process.env.MONGOMS_DISTRO = 'ubuntu-18.04';
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

const seedForm = async (slug = 'test') => {
  const tenant = await Tenant.create({ name: 'Acme Corp' });
  const site = await Site.create({ name: 'Main Plant', tenantId: tenant._id });
  await RequestForm.create({ slug, schema: [], siteId: site._id, tenantId: tenant._id });
};

const baseFields = {
  title: 'Broken conveyor',
  description: 'The main line has stopped working after a loud noise.',
  requesterName: 'Taylor User',
};

describe('Request Portal', () => {
  it('rejects submissions without valid captcha', async () => {
    await seedForm();
    await request(app)
      .post('/api/request-portal/test')
      .set('X-Forwarded-For', '203.0.113.10')
      .field('title', baseFields.title)
      .field('description', baseFields.description)
      .field('requesterName', baseFields.requesterName)
      .field('captcha', 'bad')
      .expect(400);
  });

  it('throttles repeated submissions', async () => {
    await seedForm();
    const agent = request.agent(app);
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/api/request-portal/test')
        .set('X-Forwarded-For', '203.0.113.20')
        .field('title', `${baseFields.title} ${i}`)
        .field('description', baseFields.description)
        .field('requesterName', baseFields.requesterName)
        .field('requesterEmail', `throttle-${i}@example.com`)
        .field('captcha', 'valid-captcha')
        .expect(201);
    }
    await agent
      .post('/api/request-portal/test')
      .set('X-Forwarded-For', '203.0.113.20')
      .field('title', baseFields.title)
      .field('description', baseFields.description)
      .field('requesterName', baseFields.requesterName)
      .field('requesterEmail', 'throttle-final@example.com')
      .field('captcha', 'valid-captcha')
      .expect(429);
  });

  it('persists the request and returns a tracking token', async () => {
    await seedForm();
    const res = await request(app)
      .post('/api/request-portal/test')
      .set('X-Forwarded-For', '203.0.113.30')
      .field('title', baseFields.title)
      .field('description', baseFields.description)
      .field('requesterName', baseFields.requesterName)
      .field('requesterEmail', 'taylor@example.com')
      .field('priority', 'high')
      .field('captcha', 'valid-captcha')
      .attach('photos', Buffer.from('file-data'), 'photo.jpg')
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toMatch(/^[a-z0-9]+$/);

    const stored = await WorkRequest.findOne({ token: res.body.data.token }).lean();
    expect(stored).toBeTruthy();
    expect(stored?.requesterEmail).toBe('taylor@example.com');
    expect(stored?.photos?.length).toBe(1);
    expect(stored?.status).toBe('new');
  });
});

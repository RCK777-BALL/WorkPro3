/*
 * SPDX-License-Identifier: MIT
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';

import webhooksRouter from '../../src/modules/webhooks';
import ApiKey from '../../models/ApiKey';
import WebhookSubscription from '../../models/WebhookSubscription';
import { generateApiKey } from '../../utils/apiKeys';
import { RETRY_DELAY_MS } from '../../src/modules/webhooks/service';

const app = express();
app.use(express.json());
app.use('/api/webhooks/v2', webhooksRouter);

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

const seedApiKey = async () => {
  const generated = generateApiKey();
  await ApiKey.create({
    name: 'Webhook Key',
    keyHash: generated.keyHash,
    prefix: generated.prefix,
    tenantId: new mongoose.Types.ObjectId(),
    scopes: ['integrations.manage'],
  });
  return generated.key;
};

describe('webhook delivery', () => {
  it('signs webhook payloads', async () => {
    const apiKey = await seedApiKey();
    const subscription = await WebhookSubscription.create({
      name: 'Hook',
      url: 'http://example.com',
      events: ['workorders.created'],
      secret: 'topsecret',
      tenantId: new mongoose.Types.ObjectId(),
      active: true,
    });

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const payload = { id: 42 };
    await request(app)
      .post('/api/webhooks/v2/events')
      .set('x-api-key', apiKey)
      .send({ event: 'workorders.created', payload })
      .expect(202);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const timestamp = options.headers['X-Webhook-Timestamp'];
    const signature = crypto
      .createHmac('sha256', subscription.secret)
      .update(`${timestamp}.${JSON.stringify({ event: 'workorders.created', data: payload })}`)
      .digest('hex');
    expect(options.headers['X-Webhook-Signature']).toBe(signature);

    vi.unstubAllGlobals();
  });

  it('retries failed deliveries', async () => {
    const apiKey = await seedApiKey();
    await WebhookSubscription.create({
      name: 'Hook',
      url: 'http://example.com',
      events: ['workorders.created'],
      secret: 'retry-secret',
      tenantId: new mongoose.Types.ObjectId(),
      active: true,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    await request(app)
      .post('/api/webhooks/v2/events')
      .set('x-api-key', apiKey)
      .send({ event: 'workorders.created', payload: { id: 1 } })
      .expect(202);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';

import webhooksRoutes from '../routes/WebhooksRoutes';
import WebhookSubscription from '../models/WebhookSubscription';
import ApiKey from '../models/ApiKey';
import * as dispatcher from '../utils/webhookDispatcher';
import { generateApiKey } from '../utils/apiKeys';

const { dispatchEvent, RETRY_DELAY_MS } = dispatcher;

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRoutes);

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

describe('Webhook subscription', () => {
  it('creates a subscription', async () => {
    const generated = generateApiKey();
    await ApiKey.create({
      name: 'Test Key',
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .post('/api/webhooks/register')
      .set('x-api-key', generated.key)
      .send({ url: 'http://example.com', event: 'WO.created' })
      .expect(201);

    expect(res.body.secret).toBeDefined();
    const count = await WebhookSubscription.countDocuments();
    expect(count).toBe(1);
  });

  it('prevents duplicate subscriptions via Idempotency-Key', async () => {
    const key = 'abc123';
    const generated = generateApiKey();
    await ApiKey.create({
      name: 'Test Key',
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId: new mongoose.Types.ObjectId(),
    });
    await request(app)
      .post('/api/webhooks/register')
      .set('Idempotency-Key', key)
      .set('x-api-key', generated.key)
      .send({ url: 'http://example.com', event: 'WO.created' })
      .expect(201);

    await request(app)
      .post('/api/webhooks/register')
      .set('Idempotency-Key', key)
      .set('x-api-key', generated.key)
      .send({ url: 'http://example.com', event: 'WO.created' })
      .expect(409);
  });
});

describe('Webhook event endpoint', () => {
  it('validates event payloads', async () => {
    const generated = generateApiKey();
    await ApiKey.create({
      name: 'Test Key',
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId: new mongoose.Types.ObjectId(),
    });
    await request(app)
      .post('/api/webhooks/event')
      .set('x-api-key', generated.key)
      .send({})
      .expect(400);
  });

  it('dispatches events via dispatcher', async () => {
    const spy = vi.spyOn(dispatcher, 'dispatchEvent').mockResolvedValue();
    const generated = generateApiKey();
    await ApiKey.create({
      name: 'Test Key',
      keyHash: generated.keyHash,
      prefix: generated.prefix,
      tenantId: new mongoose.Types.ObjectId(),
    });
    await request(app)
      .post('/api/webhooks/event')
      .set('x-api-key', generated.key)
      .send({ event: 'WO.created', payload: { id: 1 } })
      .expect(202);
    expect(spy).toHaveBeenCalledWith('WO.created', { id: 1 });
    spy.mockRestore();
  });
});

describe('Webhook dispatch', () => {
  it('sends signed events', async () => {
    const hook = await WebhookSubscription.create({
      name: 'Hook',
      url: 'http://example.com',
      events: ['WO.created'],
      secret: 'shhh',
      tenantId: new mongoose.Types.ObjectId(),
      active: true,
    });
    const payload = { id: 1 };
    const body = { event: 'WO.created', data: payload };

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await dispatchEvent('WO.created', payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const args = fetchMock.mock.calls[0];
    const timestamp = args[1].headers['X-Webhook-Timestamp'];
    const expectedSig = crypto
      .createHmac('sha256', hook.secret)
      .update(`${timestamp}.${JSON.stringify(body)}`)
      .digest('hex');
    expect(args[1].headers['X-Webhook-Signature']).toBe(expectedSig);

    vi.unstubAllGlobals();
  });

  it('retries on failure', async () => {
    await WebhookSubscription.create({
      name: 'Hook',
      url: 'http://example.com',
      events: ['WO.created'],
      secret: 'shhh',
      tenantId: new mongoose.Types.ObjectId(),
      active: true,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();

    await dispatchEvent('WO.created', {});
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});

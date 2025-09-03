import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import webhooksRoutes from '../routes/webhooks';
import Webhook from '../models/Webhook';
import { dispatchEvent, RETRY_DELAY_MS } from '../utils/webhookDispatcher';
const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRoutes);
let mongo;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
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
        const res = await request(app)
            .post('/api/webhooks/subscribe')
            .send({ url: 'http://example.com', event: 'WO.created' })
            .expect(201);
        expect(res.body.secret).toBeDefined();
        const count = await Webhook.countDocuments();
        expect(count).toBe(1);
    });
    it('prevents duplicate subscriptions via Idempotency-Key', async () => {
        const key = 'abc123';
        await request(app)
            .post('/api/webhooks/subscribe')
            .set('Idempotency-Key', key)
            .send({ url: 'http://example.com', event: 'WO.created' })
            .expect(201);
        await request(app)
            .post('/api/webhooks/subscribe')
            .set('Idempotency-Key', key)
            .send({ url: 'http://example.com', event: 'WO.created' })
            .expect(409);
    });
});
describe('Webhook dispatch', () => {
    it('sends signed events', async () => {
        const hook = await Webhook.create({
            url: 'http://example.com',
            event: 'WO.created',
            secret: 'shhh',
        });
        const payload = { id: 1 };
        const body = { event: 'WO.created', data: payload };
        const expectedSig = crypto
            .createHmac('sha256', hook.secret)
            .update(JSON.stringify(body))
            .digest('hex');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', fetchMock);
        await dispatchEvent('WO.created', payload);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const args = fetchMock.mock.calls[0];
        expect(args[1].headers['X-Signature']).toBe(expectedSig);
        vi.unstubAllGlobals();
    });
    it('retries on failure', async () => {
        await Webhook.create({
            url: 'http://example.com',
            event: 'WO.created',
            secret: 'shhh',
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

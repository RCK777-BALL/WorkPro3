import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import requestPortalRoutes from '../routes/requestPortal';
import RequestForm from '../models/RequestForm';
const app = express();
app.use(express.json());
app.use('/api/request-portal', requestPortalRoutes);
let mongo;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
});
describe('Request Portal', () => {
    it('rejects submissions without valid captcha', async () => {
        await RequestForm.create({ slug: 'test', schema: [] });
        await request(app)
            .post('/api/request-portal/test')
            .send({ field: 'value', captcha: 'bad' })
            .expect(400);
    });
    it('throttles repeated submissions', async () => {
        await RequestForm.create({ slug: 'test', schema: [] });
        const agent = request.agent(app);
        for (let i = 0; i < 5; i++) {
            await agent
                .post('/api/request-portal/test')
                .send({ captcha: 'valid-captcha' })
                .expect(200);
        }
        await agent
            .post('/api/request-portal/test')
            .send({ captcha: 'valid-captcha' })
            .expect(429);
    });
});

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
let app;
beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'testsecret';
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.CORS_ORIGIN = 'http://localhost';
    app = (await import('../server')).default;
});
describe('Security headers', () => {
    it('sets common security headers via helmet', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-dns-prefetch-control']).toBe('off');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
});

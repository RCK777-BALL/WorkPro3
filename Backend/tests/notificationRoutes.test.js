import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import notificationRoutes from '../routes/notifications';
import Notification from '../models/Notification';
import User from '../models/User';
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);
const io = { emit: vi.fn() };
app.set('io', io);
let mongo;
let tenantA;
let tenantB;
let tokenA;
let tokenB;
let userA;
let userB;
beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    mongo = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
    await mongoose.connect(mongo.getUri());
    tenantA = new mongoose.Types.ObjectId();
    tenantB = new mongoose.Types.ObjectId();
    userA = await User.create({
        name: 'A',
        email: 'a@example.com',
        password: 'pass',
        role: 'admin',
        tenantId: tenantA,
    });
    userB = await User.create({
        name: 'B',
        email: 'b@example.com',
        password: 'pass',
        role: 'admin',
        tenantId: tenantB,
    });
    tokenA = jwt.sign({ id: userA._id.toString(), role: userA.role }, process.env.JWT_SECRET);
    tokenB = jwt.sign({ id: userB._id.toString(), role: userB.role }, process.env.JWT_SECRET);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    await User.create({ _id: userA._id, name: userA.name, email: userA.email, password: userA.password, role: userA.role, tenantId: tenantA });
    await User.create({ _id: userB._id, name: userB.name, email: userB.email, password: userB.password, role: userB.role, tenantId: tenantB });
    io.emit.mockReset();
});
describe('Notification Routes', () => {
    it('creates notification and emits event', async () => {
        const res = await request(app)
            .post('/api/notifications')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ message: 'hello' })
            .expect(201);
        expect(res.body.message).toBe('hello');
        expect(res.body.tenantId).toBe(tenantA.toString());
        expect(io.emit).toHaveBeenCalledWith('notification', expect.objectContaining({ _id: res.body._id }));
    });
    it('retrieves notifications scoped to tenant', async () => {
        await Notification.create({ tenantId: tenantA, user: userA._id, message: 'A1' });
        await Notification.create({ tenantId: tenantB, user: userB._id, message: 'B1' });
        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].message).toBe('A1');
    });
    it('updates notification within tenant only', async () => {
        const note = await Notification.create({ tenantId: tenantA, user: userA._id, message: 'A1' });
        const res = await request(app)
            .put(`/api/notifications/${note._id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ read: true })
            .expect(200);
        expect(res.body.read).toBe(true);
        await request(app)
            .put(`/api/notifications/${note._id}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ read: true })
            .expect(404);
    });
});

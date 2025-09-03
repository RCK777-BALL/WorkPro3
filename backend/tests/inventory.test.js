import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import inventoryRoutes from '../routes/InventoryRoutes';
import InventoryItem from '../models/InventoryItem';
import User from '../models/User';
const app = express();
app.use(express.json());
app.use('/api/inventory', inventoryRoutes);
let mongo;
let token;
let user;
let eachId;
let caseId;
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
    token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET);
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    eachId = new mongoose.Types.ObjectId();
    caseId = new mongoose.Types.ObjectId();
    await mongoose.connection.db
        .collection('unitOfMeasure')
        .insertMany([
        { _id: eachId, name: 'Each' },
        { _id: caseId, name: 'Case' },
    ]);
    await mongoose.connection.db
        .collection('conversions')
        .insertMany([
        { from: caseId, to: eachId, factor: 12 },
        { from: eachId, to: caseId, factor: 1 / 12 },
    ]);
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
    it('converts case to each usage', async () => {
        const item = await InventoryItem.create({
            name: 'Widget',
            quantity: 2,
            tenantId: user.tenantId,
            uom: caseId,
        });
        const res = await request(app)
            .post(`/api/inventory/${item._id}/use`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 6, uom: eachId.toString() })
            .expect(200);
        expect(res.body.quantity).toBeCloseTo(1.5);
    });
    it('converts each to case usage', async () => {
        const item = await InventoryItem.create({
            name: 'Widget',
            quantity: 24,
            tenantId: user.tenantId,
            uom: eachId,
        });
        const res = await request(app)
            .post(`/api/inventory/${item._id}/use`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 1, uom: caseId.toString() })
            .expect(200);
        expect(res.body.quantity).toBe(12);
    });
    it('returns error when conversion missing', async () => {
        const item = await InventoryItem.create({
            name: 'Widget',
            quantity: 1,
            tenantId: user.tenantId,
            uom: caseId,
        });
        const badUom = new mongoose.Types.ObjectId();
        await request(app)
            .post(`/api/inventory/${item._id}/use`)
            .set('Authorization', `Bearer ${token}`)
            .send({ quantity: 1, uom: badUom.toString() })
            .expect(400);
    });
});

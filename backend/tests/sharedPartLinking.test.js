import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SharedPart from '../models/SharedPart';
import InventoryItem from '../models/InventoryItem';
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
describe('Shared part linking', () => {
    it('links inventory to shared part', async () => {
        const tenantId = new mongoose.Types.ObjectId();
        const siteId = new mongoose.Types.ObjectId();
        const part = await SharedPart.create({
            name: 'Bolt',
            tenantId,
        });
        const item = await InventoryItem.create({
            name: 'Bolt stock',
            quantity: 5,
            tenantId,
            siteId,
            sharedPartId: part._id,
        });
        const fetched = await InventoryItem.findById(item._id).populate('sharedPartId').lean();
        expect(fetched?.sharedPartId).toBeDefined();
        expect(fetched.sharedPartId.name).toBe('Bolt');
    });
});

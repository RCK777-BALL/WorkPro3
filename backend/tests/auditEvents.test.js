import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditEvent from '../models/AuditEvent';
let mongo;
beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
});
describe('AuditEvent immutability', () => {
    it('prevents update and delete', async () => {
        const event = await AuditEvent.create({ tenantId: new mongoose.Types.ObjectId(), action: 'login' });
        await expect(AuditEvent.updateOne({ _id: event._id }, { action: 'changed' })).rejects.toThrow('AuditEvent is immutable');
        await expect(AuditEvent.deleteOne({ _id: event._id })).rejects.toThrow('AuditEvent is immutable');
    });
});

import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventEmitter } from 'events';

import { startMQTTIngest } from '../services/mqttIngest';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notification';

class MockClient extends EventEmitter {
  subscribe(topic: string) {
    // no-op for tests
  }
  publish(topic: string, message: string) {
    this.emit('message', topic, Buffer.from(message));
  }
}

describe('MQTT ingestion', () => {
  let mongo: MongoMemoryServer;
  let tenantId: string;
  let client: MockClient;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    tenantId = new mongoose.Types.ObjectId().toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    client = new MockClient();
    await startMQTTIngest({ url: 'mqtt://test' }, client as any);
  });

  it('stores meter readings from MQTT messages', async () => {
    const asset = new mongoose.Types.ObjectId().toString();
    client.publish(`tenants/${tenantId}/meters`, JSON.stringify({
      asset,
      metric: 'kWh',
      value: 50,
    }));
    await new Promise((r) => setTimeout(r, 10));
    const readings = await SensorReading.find();
    expect(readings.length).toBe(1);
    expect(readings[0].asset.toString()).toBe(asset);
    expect(readings[0].tenantId.toString()).toBe(tenantId);
    const notes = await Notification.find();
    expect(notes.length).toBe(0);
  });

  it('triggers threshold rule and creates notification', async () => {
    const asset = new mongoose.Types.ObjectId().toString();
    client.publish(`tenants/${tenantId}/meters`, JSON.stringify({
      asset,
      metric: 'kWh',
      value: 150,
    }));
    await new Promise((r) => setTimeout(r, 10));
    const notes = await Notification.find();
    expect(notes.length).toBe(1);
    expect(notes[0].tenantId.toString()).toBe(tenantId);
  });

  it('handles authentication errors from MQTT broker', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    client.emit('error', new Error('Not authorized'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});


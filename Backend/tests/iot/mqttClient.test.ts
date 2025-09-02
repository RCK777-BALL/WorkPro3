import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventEmitter } from 'events';

import { startMQTTClient } from '../../iot/mqttClient';
import SensorReading from '../../models/SensorReading';
import { mqttLogger } from '../../utils/logger';

class MockClient extends EventEmitter {
  subscribe(_topic: string, cb?: (err?: Error) => void) {
    cb?.();
  }
  publish(topic: string, message: string) {
    this.emit('message', topic, Buffer.from(message));
  }
  reconnect() {
    this.emit('reconnect');
  }
}

describe('MQTT client', () => {
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
    startMQTTClient({ url: 'mqtt://test' }, client as any);
  });

  it('persists sensor readings from MQTT messages', async () => {
    const asset = new mongoose.Types.ObjectId().toString();
    client.publish(`tenants/${tenantId}/readings`, JSON.stringify({
      asset,
      metric: 'temp',
      value: 42,
    }));
    await new Promise((r) => setTimeout(r, 10));
    const readings = await SensorReading.find();
    expect(readings.length).toBe(1);
    expect(readings[0].asset.toString()).toBe(asset);
    expect(readings[0].tenantId.toString()).toBe(tenantId);
  });

  it('logs errors from MQTT client', () => {
    const spy = vi.spyOn(mqttLogger, 'error').mockImplementation(() => {} as any);
    client.emit('error', new Error('fail'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('attempts to reconnect when the connection closes', () => {
    const warnSpy = vi
      .spyOn(mqttLogger, 'warn')
      .mockImplementation(() => {} as any);
    const reconnectSpy = vi.spyOn(client, 'reconnect');
    client.emit('close');
    expect(warnSpy).toHaveBeenCalledWith(
      'MQTT connection closed, attempting reconnect'
    );
    expect(reconnectSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    reconnectSpy.mockRestore();
  });
});

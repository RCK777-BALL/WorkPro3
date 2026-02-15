/*
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';

const loggerSpies = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('mqtt', () => ({
  default: { connect: vi.fn() },
}));

vi.mock('../../utils/logger', () => ({
  mqttLogger: loggerSpies,
}));

import mqtt from 'mqtt';
import { createMqttClient } from '../../iot/mqttClient';

describe('createMqttClient', () => {
  it('connects to broker and handles events', () => {
    const mockClient = Object.assign(new EventEmitter(), {
      subscribe: vi.fn((_topic: string, callback?: (err?: Error) => void) => callback?.()),
    });
    (mqtt as any).connect.mockReturnValue(mockClient);

    const client = createMqttClient('mqtt://test');

    expect(mqtt.connect).toHaveBeenCalledWith('mqtt://test', expect.any(Object));

    mockClient.emit('connect');
    expect(loggerSpies.info).toHaveBeenCalledWith('MQTT connected:', 'mqtt://test');

    const emittedError: Error = new Error('fail');
    mockClient.emit('error', emittedError);
    expect(loggerSpies.error).toHaveBeenCalledWith('MQTT error:', emittedError);

    expect(client).toBe(mockClient);
  });
});

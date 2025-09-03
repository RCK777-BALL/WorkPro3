import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('mqtt', () => ({
  default: { connect: vi.fn() },
}));

import mqtt from 'mqtt';
import { createMqttClient } from '../../iot/mqttClient';

describe('createMqttClient', () => {
  it('connects to broker and handles events', () => {
    const mockClient = new EventEmitter();
    (mqtt as any).connect.mockReturnValue(mockClient);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const client = createMqttClient('mqtt://test');

    expect(mqtt.connect).toHaveBeenCalledWith('mqtt://test', expect.any(Object));

    mockClient.emit('connect');
    expect(logSpy).toHaveBeenCalledWith('MQTT connected:', 'mqtt://test');

    const error = new Error('fail');
    mockClient.emit('error', error);
    expect(errSpy).toHaveBeenCalledWith('MQTT error:', error);

    expect(client).toBe(mockClient);

    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});

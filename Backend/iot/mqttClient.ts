import type { MqttClient } from 'mqtt';
import mqtt from 'mqtt';
import config from '../config/default';
import SensorReading from '../models/SensorReading';
import { mqttLogger } from '../utils/logger';

export interface MQTTOptions {
  url: string;
  username?: string;
  password?: string;
}

export function startMQTTClient(
  options: MQTTOptions,
  client?: MqttClient
): MqttClient {
  const mqttClient =
    client ||
    mqtt.connect(options.url, {
      username: options.username,
      password: options.password,
    });

  mqttClient.on('connect', () => {
    mqttLogger.info('MQTT connected');
    mqttClient.subscribe('tenants/+/readings', (err: { message: any; }) => {
      if (err) {
        mqttLogger.error('MQTT subscribe error', { error: err.message });
      } else {
        mqttLogger.info('Subscribed to tenant sensor topics');
      }
    });
  });

  mqttClient.on('reconnect', () => mqttLogger.warn('MQTT reconnecting'));
  mqttClient.on('close', () => mqttLogger.warn('MQTT connection closed'));
  mqttClient.on('error', (err: { message: any; }) => mqttLogger.error('MQTT error', { error: err.message }));

  mqttClient.on('message', async (topic: string, payload: { toString: () => string; }) => {
    try {
      const match = topic.match(/^tenants\/(.+?)\/readings$/);
      if (!match) return;
      const tenantId = match[1];
      const data = JSON.parse(payload.toString());
      if (!data.asset || !data.metric || typeof data.value !== 'number') return;

      await SensorReading.create({
        asset: data.asset,
        metric: data.metric,
        value: data.value,
        timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
        tenantId,
      });
    } catch (err) {
      mqttLogger.error('Failed to process MQTT message', { error: (err as Error).message });
    }
  });

  return mqttClient;
}

export function initMQTTFromConfig(): MqttClient | null {
  if (!config.mqtt.url) {
    return null;
  }
  return startMQTTClient(config.mqtt);
}

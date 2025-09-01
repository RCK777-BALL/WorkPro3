import type { MqttClient } from 'mqtt';
import SensorReading from '../models/SensorReading';
import Notification from '../models/Notification';

export interface MQTTOptions {
  url: string;
  username?: string;
  password?: string;
}

const THRESHOLD = 100; // simple rule threshold

export async function startMQTTIngest(
  options: MQTTOptions,
  client?: MqttClient
): Promise<MqttClient> {
  const mqttClient =
    client ||
    (await import('mqtt')).connect(options.url, {
      username: options.username,
      password: options.password,
    });

  mqttClient.on('connect', () => {
    mqttClient.subscribe('tenants/+/meters');
  });

  mqttClient.on('error', (err) => {
    console.error('MQTT error', err.message);
  });

  mqttClient.on('message', async (topic, payload) => {
    try {
      const match = topic.match(/^tenants\/(.+?)\/meters$/);
      if (!match) return;
      const tenantId = match[1];
      const data = JSON.parse(payload.toString());
      if (!data.asset || !data.metric || typeof data.value !== 'number') return;

      await SensorReading.create({
        asset: data.asset,
        metric: data.metric,
        value: data.value,
        tenantId,
      });

      if (data.value > THRESHOLD) {
        await Notification.create({
          tenantId,
          message: `Threshold exceeded for asset ${data.asset}`,
        });
      }
    } catch (err) {
      console.error('Failed to process MQTT message', err);
    }
  });

  return mqttClient;
}

export default { startMQTTIngest };

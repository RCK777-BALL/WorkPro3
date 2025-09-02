import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import config from '../config/default';

const options: IClientOptions = {};

export function createMqttClient(brokerUrl: string): MqttClient {
  const client = mqtt.connect(brokerUrl, options);
  client.on('connect', () => console.log('MQTT connected:', brokerUrl));
  client.on('error', (err: any) => console.error('MQTT error:', err));
  return client;
}

export function initMQTTFromConfig(): MqttClient | null {
  const url = config.mqtt.url;
  if (!url) return null;
  return createMqttClient(url);
}

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import config from "../config/default";
import { mqttLogger } from "../utils/logger";

const options: IClientOptions = {};

export function createMqttClient(brokerUrl: string): MqttClient {
  const client = mqtt.connect(brokerUrl, options);
  client.on("connect", () => mqttLogger.info("MQTT connected:", brokerUrl));
  client.on("error", (err: Error) => mqttLogger.error("MQTT error:", err));
  return client;
}

export function initMQTTFromConfig(): MqttClient | null {
  const url = config.mqtt.url;
  if (!url) return null;
  return createMqttClient(url);
}

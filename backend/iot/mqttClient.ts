/*
 * SPDX-License-Identifier: MIT
 */

import mqtt, { MqttClient, IClientOptions } from "mqtt";
import config from "../config/default";
import { mqttLogger } from "../utils/logger";
import { ingestTelemetryBatch, type IoTReadingInput } from "../services/iotIngestionService";

const options: IClientOptions = {};
const IOT_TOPIC = "workpro/iot/ingest";

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

async function processMessage(payload: Buffer) {
  try {
    const decoded = JSON.parse(payload.toString());
    const readings = toArray<IoTReadingInput | (IoTReadingInput & { tenantId?: string })>(
      Array.isArray(decoded?.readings) ? decoded.readings : decoded,
    ).map((reading): IoTReadingInput => {
      const entry: IoTReadingInput = {};
      const assetId = reading.assetId ?? reading.asset;
      if (typeof assetId === "string" && assetId.trim()) {
        entry.assetId = assetId;
      }
      if (typeof reading.metric === "string" && reading.metric.trim()) {
        entry.metric = reading.metric;
      }
      if (typeof reading.value === "number" || typeof reading.value === "string") {
        entry.value = reading.value;
      }
      if (reading.timestamp instanceof Date || typeof reading.timestamp === "string") {
        entry.timestamp = reading.timestamp;
      }
      return entry;
    });
    const tenantId =
      (typeof decoded?.tenantId === "string" && decoded.tenantId) ||
      (typeof decoded?.tenant === "string" && decoded.tenant) ||
      (readings[0] as unknown as { tenantId?: string })?.tenantId;
    if (!tenantId) {
      throw new Error("Missing tenantId in MQTT payload");
    }
    if (!readings.length) {
      throw new Error("No readings found in MQTT payload");
    }
    await ingestTelemetryBatch({ tenantId, readings, source: "mqtt" });
    mqttLogger.debug(`Processed ${readings.length} IoT readings for tenant ${tenantId}`);
  } catch (err) {
    mqttLogger.error("Failed to process MQTT message", err as Error);
  }
}

export function createMqttClient(brokerUrl: string): MqttClient {
  const client = mqtt.connect(brokerUrl, options);
  client.on("connect", () => {
    mqttLogger.info("MQTT connected:", brokerUrl);
    client.subscribe(IOT_TOPIC, (subscribeErr) => {
      if (subscribeErr) {
        mqttLogger.error("MQTT subscription failed", subscribeErr);
      } else {
        mqttLogger.info(`Subscribed to ${IOT_TOPIC}`);
      }
    });
  });
  client.on("error", (err: Error) => mqttLogger.error("MQTT error:", err));
  client.on("message", (topic: string, payload: Buffer) => {
    if (topic !== IOT_TOPIC) return;
    void processMessage(payload);
  });
  return client;
}

export function initMQTTFromConfig(): MqttClient | null {
  const url = config.mqtt.url;
  if (!url) return null;
  return createMqttClient(url);
}

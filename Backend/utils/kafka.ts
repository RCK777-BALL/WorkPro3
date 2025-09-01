import { Kafka, logLevel, EachMessagePayload } from 'kafkajs';
import type { Server as SocketIOServer } from 'socket.io';

const brokersEnv = process.env.KAFKA_BROKERS || '';
const brokers = brokersEnv.split(',').map((b) => b.trim()).filter(Boolean);
const enabled = brokers.length > 0;

const clientId = process.env.KAFKA_CLIENT_ID || 'cmms-backend';
const groupId = process.env.KAFKA_GROUP_ID || 'cmms-backend-group';

const kafka = enabled
  ? new Kafka({ clientId, brokers, logLevel: logLevel.ERROR })
  : null as unknown as Kafka;

export const producer = enabled ? kafka.producer() : null;
const consumer = enabled ? kafka.consumer({ groupId }) : null;

export const initKafka = async (io?: SocketIOServer) => {
  if (!enabled) return;
  await producer!.connect();
  await consumer!.connect();
  await consumer!.subscribe({ topic: 'workOrderUpdates' });
  await consumer!.subscribe({ topic: 'inventoryUpdates' });
  if (io) {
    await consumer!.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        if (!message.value) return;
        const payload = JSON.parse(message.value.toString());
        if (topic === 'workOrderUpdates') {
          io.emit('workOrderUpdated', payload);
        } else if (topic === 'inventoryUpdates') {
          io.emit('inventoryUpdated', payload);
        }
      },
    });
  }
};

export const sendKafkaEvent = async (topic: string, payload: unknown) => {
  if (!enabled) return;
  try {
    await producer!.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  } catch (err) {
    console.error('Kafka send error:', err);
  }
};

/*
 * SPDX-License-Identifier: MIT
 */

import { Kafka, logLevel } from 'kafkajs';
import type { Producer, Consumer, EachMessagePayload, KafkaConfig } from 'kafkajs';
import type { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';

const brokersEnv = process.env.KAFKA_BROKERS || '';
const brokers = brokersEnv.split(',').map((b) => b.trim()).filter(Boolean);
const disableFlag = (process.env.MESSAGING_DISABLED || '').toLowerCase() === 'true';
const enabled = !disableFlag && brokers.length > 0;

const clientId = process.env.KAFKA_CLIENT_ID || 'cmms-backend';
const groupId = process.env.KAFKA_GROUP_ID || 'cmms-backend-group';

export const messagingTopics = {
  workOrders: process.env.KAFKA_WORK_ORDER_TOPIC || 'workOrderUpdates',
  inventory: process.env.KAFKA_INVENTORY_TOPIC || 'inventoryUpdates',
};

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const queueLimit = parseNumber(process.env.MESSAGING_QUEUE_LIMIT, 1_000);
const maxAttempts = parseNumber(process.env.MESSAGING_MAX_ATTEMPTS, 5);
const baseBackoffMs = parseNumber(process.env.MESSAGING_RETRY_BACKOFF_MS, 500);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface MessagingHealth {
  enabled: boolean;
  producerReady: boolean;
  consumerReady: boolean;
  backpressure: boolean;
  queueDepth: number;
  lastFailure?: string;
}

interface QueueMessage {
  topic: string;
  payload: unknown;
  attempts: number;
  enqueuedAt: number;
  lastError?: string;
}

type KafkaFactory = (config: KafkaConfig) => Kafka;

export class MessagingService {
  private kafka: Kafka | null;
  private producer: Producer | null;
  private consumer: Consumer | null;
  private producerReady = false;
  private consumerReady = false;
  private flushing = false;
  private backpressure = false;
  private lastFailure?: string;
  private readonly kafkaFactory: KafkaFactory;
  private readonly queue: QueueMessage[] = [];

  constructor(
    private readonly config = {
      brokers,
      clientId,
      groupId,
      enabled,
      queueLimit,
      maxAttempts,
      baseBackoffMs,
    },
    kafkaFactory: KafkaFactory = (cfg) => new Kafka({ ...cfg, logLevel: logLevel.ERROR }),
  ) {
    this.kafkaFactory = kafkaFactory;
    if (config.enabled) {
      this.kafka = this.kafkaFactory({ clientId: config.clientId, brokers: config.brokers });
      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({ groupId: config.groupId });
    } else {
      this.kafka = null;
      this.producer = null;
      this.consumer = null;
      this.lastFailure = disableFlag ? 'messaging disabled via flag' : 'brokers not configured';
    }
  }

  getProducer() {
    return this.producer;
  }

  getConsumer() {
    return this.consumer;
  }

  async start(io?: SocketIOServer) {
    if (!this.config.enabled || !this.producer || !this.consumer) {
      logger.info('Messaging disabled; skipping Kafka init');
      return;
    }

    try {
      await this.producer.connect();
      this.producerReady = true;
      logger.info('Kafka producer ready');
    } catch (err) {
      this.producerReady = false;
      this.lastFailure = (err as Error).message;
      logger.error('Kafka producer connection failed; queuing events', err);
    }

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: messagingTopics.workOrders });
      await this.consumer.subscribe({ topic: messagingTopics.inventory });
      this.consumerReady = true;
      if (io) {
        await this.consumer.run({
          eachMessage: async ({ topic, message }: EachMessagePayload) => {
            if (!message.value) return;
            const payload = JSON.parse(message.value.toString());
            if (topic === messagingTopics.workOrders) {
              io.emit('workOrderUpdated', payload);
            } else if (topic === messagingTopics.inventory) {
              io.emit('inventoryUpdated', payload);
            }
          },
        });
      }
      logger.info('Kafka consumer ready');
    } catch (err) {
      this.consumerReady = false;
      this.lastFailure = (err as Error).message;
      logger.error('Kafka consumer connection failed', err);
    }

    if (this.producerReady) {
      void this.flushQueue();
    }
  }

  async publish(topic: string, payload: unknown) {
    if (!this.config.enabled || !this.producerReady || !this.producer) {
      this.enqueue(topic, payload, 'producer unavailable');
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(payload) }],
      });
    } catch (err) {
      const reason = (err as Error).message || 'send failed';
      this.enqueue(topic, payload, reason);
      this.lastFailure = reason;
    }
  }

  getHealth(): MessagingHealth {
    return {
      enabled: this.config.enabled,
      producerReady: this.producerReady,
      consumerReady: this.consumerReady,
      backpressure: this.backpressure,
      queueDepth: this.queue.length,
      ...(this.lastFailure ? { lastFailure: this.lastFailure } : {}),
    };
  }

  private enqueue(topic: string, payload: unknown, lastError?: string) {
    if (this.queue.length >= this.config.queueLimit) {
      this.backpressure = true;
      const dropped = this.queue.shift();
      if (dropped) {
        logger.error('Backpressure: dropping oldest message to dead-letter', dropped);
      }
    }

    this.queue.push({ topic, payload, attempts: 0, enqueuedAt: Date.now(), lastError });
    this.backpressure = this.queue.length >= this.config.queueLimit * 0.8;

    if (this.producerReady) {
      void this.flushQueue();
    }
  }

  private async flushQueue() {
    if (this.flushing || !this.producerReady || !this.producer) return;
    this.flushing = true;

    while (this.queue.length > 0 && this.producerReady) {
      const message = this.queue[0];
      try {
        await this.producer.send({
          topic: message.topic,
          messages: [{ value: JSON.stringify(message.payload) }],
        });
        this.queue.shift();
      } catch (err) {
        message.attempts += 1;
        message.lastError = (err as Error).message;
        this.lastFailure = message.lastError;

        if (message.attempts > this.config.maxAttempts) {
          logger.error('Dead-lettering message after retries', message);
          this.queue.shift();
        } else {
          const backoff = this.config.baseBackoffMs * message.attempts;
          await delay(backoff);
        }
      }
    }

    this.flushing = false;
  }
}

export const messagingService = new MessagingService();

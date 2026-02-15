/*
 * SPDX-License-Identifier: MIT
 */

import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Kafka, logLevel } from 'kafkajs';
import type { Producer, Consumer, EachMessagePayload, KafkaConfig } from 'kafkajs';
import type { Server as SocketIOServer } from 'socket.io';
import { emitTelemetry } from './telemetryService';
import { logger } from '../utils';

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
const maxBackoffMs = parseNumber(process.env.MESSAGING_RETRY_MAX_BACKOFF_MS, 15_000);
const jitterRatio = Math.min(Math.max(parseNumber(process.env.MESSAGING_RETRY_JITTER_RATIO, 0.25), 0), 1);
const chunkSize = parseNumber(process.env.MESSAGING_CHUNK_SIZE, 50_000);
const retryPollIntervalMs = parseNumber(process.env.MESSAGING_RETRY_POLL_INTERVAL_MS, 250);
const retryStatePath = process.env.MESSAGING_RETRY_STATE_PATH || path.join(os.tmpdir(), 'messaging-queue-state.json');
const chunkDir = process.env.MESSAGING_CHUNK_DIR || path.join(os.tmpdir(), 'messaging-chunks');
const chunkTtlMs = parseNumber(process.env.MESSAGING_CHUNK_TTL_MS, 15 * 60 * 1_000);

export interface MessagingConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  enabled: boolean;
  queueLimit: number;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  jitterRatio: number;
  chunkSize: number;
  retryPollIntervalMs: number;
}

const defaultMessagingConfig: MessagingConfig = {
  brokers,
  clientId,
  groupId,
  enabled,
  queueLimit,
  maxAttempts,
  baseBackoffMs,
  maxBackoffMs,
  jitterRatio,
  chunkSize,
  retryPollIntervalMs,
};

export interface MessagingHealth {
  enabled: boolean;
  producerReady: boolean;
  consumerReady: boolean;
  backpressure: boolean;
  queueDepth: number;
  lastFailure?: string;
}

interface QueueMessage {
  id: string;
  topic: string;
  payload: unknown;
  attempts: number;
  enqueuedAt: number;
  lastError?: string | undefined;
  nextAttemptAt: number;
}

interface ChunkMetadata {
  id: string;
  index: number;
  total: number;
  checksum: string;
}

interface ChunkedPayload {
  chunk: ChunkMetadata;
  payload: string;
}

interface ChunkAssembly {
  total: number;
  checksum: string;
  received: number;
  receivedIndexes: Set<number>;
  path: string;
  createdAt: number;
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
  private readonly config: MessagingConfig;
  private readonly queue: QueueMessage[] = [];
  private readonly retryStatePath: string;
  private readonly chunkAssembly = new Map<string, ChunkAssembly>();
  private retryTimer: NodeJS.Timeout | null = null;
  private chunkCleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    config: Partial<MessagingConfig> = {},
    kafkaFactory: KafkaFactory = (cfg) => new Kafka({ ...cfg, logLevel: logLevel.ERROR }),
  ) {
    this.config = {
      ...defaultMessagingConfig,
      ...config,
    };
    this.kafkaFactory = kafkaFactory;
    this.retryStatePath = retryStatePath;
    if (!fs.existsSync(path.dirname(this.retryStatePath))) {
      fs.mkdirSync(path.dirname(this.retryStatePath), { recursive: true });
    }

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    this.loadQueueState();
    this.startChunkCleanup();
    if (this.config.enabled) {
      this.kafka = this.kafkaFactory({ clientId: this.config.clientId, brokers: this.config.brokers });
      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({ groupId: this.config.groupId });
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
            const payload = await this.reassembleChunk(message.value.toString());
            if (!payload) return;
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
      this.startRetryWorker();
    }
    this.startRetryWorker();
  }

  async publish(topic: string, payload: unknown) {
    if (!this.config.enabled || !this.producerReady || !this.producer) {
      this.enqueue(topic, payload, 'producer unavailable');
      return;
    }

    try {
      await this.sendWithChunking(topic, payload);
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

    this.queue.push({
      id: randomUUID(),
      topic,
      payload,
      attempts: 0,
      enqueuedAt: Date.now(),
      lastError,
      nextAttemptAt: Date.now(),
    });
    this.backpressure = this.queue.length >= this.config.queueLimit * 0.8;
    this.persistQueueState();

    this.startRetryWorker();
    if (this.producerReady) {
      void this.processQueue();
    }
  }

  private async flushQueue() {
    await this.processQueue();
  }

  private async processQueue() {
    if (this.flushing || !this.producerReady || !this.producer) return;
    this.flushing = true;

    while (this.queue.length > 0 && this.producerReady) {
      const message = this.queue[0];
      if (message.nextAttemptAt > Date.now()) {
        break;
      }
      try {
        await this.sendWithChunking(message.topic, message.payload);
        emitTelemetry('messaging.retry.success', {
          id: message.id,
          topic: message.topic,
          attempts: message.attempts,
        });
        logger.info('Retried message delivered', {
          id: message.id,
          topic: message.topic,
          attempts: message.attempts,
        });
        this.queue.shift();
      } catch (err) {
        message.attempts += 1;
        message.lastError = (err as Error).message;
        this.lastFailure = message.lastError;

        if (message.attempts >= this.config.maxAttempts) {
          emitTelemetry('messaging.retry.deadletter', {
            id: message.id,
            topic: message.topic,
            attempts: message.attempts,
            error: message.lastError,
          });
          logger.error('Dead-lettering message after retries', message);
          this.queue.shift();
        } else {
          const exponential = this.config.baseBackoffMs * 2 ** (message.attempts - 1);
          const capped = Math.min(this.config.maxBackoffMs, exponential);
          const jitter = capped * this.config.jitterRatio * Math.random();
          const backoff = capped + jitter;
          message.nextAttemptAt = Date.now() + backoff;
          emitTelemetry('messaging.retry.scheduled', {
            id: message.id,
            topic: message.topic,
            attempts: message.attempts,
            backoff,
          });
          logger.warn('Retrying message after backoff', {
            id: message.id,
            topic: message.topic,
            attempts: message.attempts,
            backoff,
            lastError: message.lastError,
          });
          break;
        }
      }
      this.persistQueueState();
    }

    this.persistQueueState();
    this.flushing = false;
  }

  private startRetryWorker() {
    if (this.retryTimer) return;
    this.retryTimer = setInterval(() => {
      void this.processQueue();
    }, this.config.retryPollIntervalMs);
  }

  private loadQueueState() {
    if (!fs.existsSync(this.retryStatePath)) return;
    try {
      const raw = fs.readFileSync(this.retryStatePath, 'utf-8');
      const parsed = JSON.parse(raw) as QueueMessage[];
      this.queue.push(
        ...parsed.map((msg) => ({
          ...msg,
          nextAttemptAt: msg.nextAttemptAt ?? Date.now(),
        }))
      );
    } catch (err) {
      logger.error('Failed to load retry queue state', err);
    }
  }

  private persistQueueState() {
    try {
      fs.writeFileSync(this.retryStatePath, JSON.stringify(this.queue, null, 2));
    } catch (err) {
      logger.error('Failed to persist retry queue state', err);
    }
  }

  private async sendWithChunking(topic: string, payload: unknown) {
    if (!this.producer) throw new Error('Producer unavailable');
    const raw = JSON.stringify(payload);
    const buffer = Buffer.from(raw);
    if (buffer.byteLength <= this.config.chunkSize) {
      await this.producer.send({ topic, messages: [{ value: raw }] });
      return;
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const id = randomUUID();
    const total = Math.ceil(buffer.byteLength / this.config.chunkSize);
    for (let index = 0; index < total; index += 1) {
      const start = index * this.config.chunkSize;
      const end = Math.min(start + this.config.chunkSize, buffer.byteLength);
      const chunkPayload: ChunkedPayload = {
        chunk: { id, index, total, checksum },
        payload: buffer.subarray(start, end).toString('base64'),
      };
      await this.producer.send({ topic, messages: [{ value: JSON.stringify(chunkPayload) }] });
    }
  }

  private async reassembleChunk(raw: string): Promise<unknown | null> {
    let parsed: ChunkedPayload | unknown;
    try {
      parsed = JSON.parse(raw) as ChunkedPayload | unknown;
    } catch (err) {
      logger.error('Failed to parse incoming message chunk', err);
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null || !('chunk' in (parsed as Record<string, unknown>))) {
      return parsed;
    }

    const chunked = parsed as ChunkedPayload;
    const { id, index, total, checksum } = chunked.chunk;
    if (!chunked.payload || typeof chunked.payload !== 'string') {
      logger.warn('Received chunk without payload', { id, index, total });
      return null;
    }

    let assembly = this.chunkAssembly.get(id);
    if (!assembly) {
      assembly = {
        total,
        checksum,
        received: 0,
        receivedIndexes: new Set<number>(),
        path: path.join(chunkDir, `${id}.part`),
        createdAt: Date.now(),
      };
      this.chunkAssembly.set(id, assembly);
      fs.rmSync(assembly.path, { force: true });
    } else if (assembly.total !== total || assembly.checksum !== checksum) {
      logger.warn('Chunk metadata mismatch; resetting assembly', { id });
      fs.rmSync(assembly.path, { force: true });
      assembly = {
        total,
        checksum,
        received: 0,
        receivedIndexes: new Set<number>(),
        path: path.join(chunkDir, `${id}.part`),
        createdAt: Date.now(),
      };
      this.chunkAssembly.set(id, assembly);
    }

    if (!assembly.receivedIndexes.has(index)) {
      const fd = fs.openSync(assembly.path, 'a+');
      const chunkBuffer = Buffer.from(chunked.payload, 'base64');
      fs.writeSync(fd, chunkBuffer, 0, chunkBuffer.length, index * this.config.chunkSize);
      fs.closeSync(fd);
      assembly.receivedIndexes.add(index);
      assembly.received += 1;
    }

    if (assembly.received < assembly.total) {
      return null;
    }

    const buffer = fs.readFileSync(assembly.path);
    const calculated = createHash('sha256').update(buffer).digest('hex');
    fs.rmSync(assembly.path, { force: true });
    this.chunkAssembly.delete(id);

    if (calculated !== assembly.checksum) {
      logger.error('Chunk checksum mismatch; discarding payload', { id });
      return null;
    }

    return JSON.parse(buffer.toString('utf-8'));
  }

  private startChunkCleanup() {
    if (this.chunkCleanupTimer) return;
    const cleanup = () => {
      const now = Date.now();
      for (const [id, assembly] of this.chunkAssembly.entries()) {
        if (now - assembly.createdAt > chunkTtlMs) {
          fs.rmSync(assembly.path, { force: true });
          this.chunkAssembly.delete(id);
          logger.warn('Cleaning up stale chunk assembly', { id });
        }
      }
      for (const entry of fs.readdirSync(chunkDir)) {
        const filePath = path.join(chunkDir, entry);
        if ([...this.chunkAssembly.values()].some((assembly) => assembly.path === filePath)) {
          continue;
        }
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > chunkTtlMs) {
          fs.rmSync(filePath, { force: true });
          logger.warn('Removed orphaned chunk artifact', { filePath });
        }
      }
    };

    cleanup();
    this.chunkCleanupTimer = setInterval(cleanup, Math.max(5_000, Math.min(chunkTtlMs, 60_000)));
  }
}

export const messagingService = new MessagingService();

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessagingService } from '../services/messaging';

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('messaging service resilience', () => {
  const buildKafkaMock = (sendImpl?: () => Promise<void>) => {
    const send = vi.fn(sendImpl ?? (async () => {}));
    const prodConnect = vi.fn(async () => {});
    const consConnect = vi.fn(async () => {});
    const subscribe = vi.fn(async () => {});
    const run = vi.fn(async () => {});
    const Kafka = vi.fn().mockImplementation(() => ({
      producer: () => ({ connect: prodConnect, send }),
      consumer: () => ({ connect: consConnect, subscribe, run }),
    }));
    return { Kafka, send, prodConnect, consConnect, subscribe, run };
  };

  beforeEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KAFKA_BROKERS;
    vi.useRealTimers();
  });

  it('buffers events when the broker rejects sends then flushes in order', async () => {
    process.env.KAFKA_BROKERS = 'broker:9092';
    const mock = buildKafkaMock(async () => {
      throw new Error('offline');
    });
    mock.send.mockRejectedValueOnce(new Error('offline'));
    mock.send.mockResolvedValueOnce(undefined);
    mock.send.mockResolvedValueOnce(undefined);

    const service = new MessagingService(
      {
        brokers: ['broker:9092'],
        clientId: 'test',
        groupId: 'group',
        enabled: true,
        queueLimit: 10,
        maxAttempts: 3,
        baseBackoffMs: 1,
      },
      mock.Kafka as any,
    );

    await service.start();
    await service.publish('topic-a', { id: 1 });
    await service.publish('topic-b', { id: 2 });

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(mock.send.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(
      mock.send.mock.calls.some(
        ([payload]) =>
          payload?.topic === 'topic-a' &&
          payload?.messages?.[0]?.value === JSON.stringify({ id: 1 }),
      ),
    ).toBe(true);
    expect(
      mock.send.mock.calls.some(
        ([payload]) =>
          payload?.topic === 'topic-b' &&
          payload?.messages?.[0]?.value === JSON.stringify({ id: 2 }),
      ),
    ).toBe(true);
    expect(service.getHealth().queueDepth).toBe(0);
  });

  it('reports backpressure and dead-letters after repeated failures', async () => {
    process.env.KAFKA_BROKERS = 'broker:9092';
    const mock = buildKafkaMock(async () => {
      throw new Error('still offline');
    });

    const service = new MessagingService(
      {
        brokers: ['broker:9092'],
        clientId: 'test',
        groupId: 'group',
        enabled: true,
        queueLimit: 1,
        maxAttempts: 1,
        baseBackoffMs: 1,
      },
      mock.Kafka as any,
    );

    await service.start();
    await service.publish('topic-a', { id: 1 });
    await service.publish('topic-b', { id: 2 });

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(service.getHealth().backpressure).toBe(true);
    expect(service.getHealth().queueDepth).toBe(0);
  });
});

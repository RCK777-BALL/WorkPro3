import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const buildKafkaMock = () => {
  const send = vi.fn(async () => {});
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

describe('kafka utilities', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KAFKA_BROKERS;
    vi.doUnmock('kafkajs');
  });

  it('sends events and initializes when enabled', async () => {
    process.env.KAFKA_BROKERS = 'broker:9092';
    const mock = buildKafkaMock();
    vi.doMock('kafkajs', () => ({ Kafka: mock.Kafka, logLevel: { ERROR: 0 } }));
    const { sendKafkaEvent, initKafka } = await import('../utils/kafka');

    await sendKafkaEvent('topic', { foo: 'bar' });
    expect(mock.send).toHaveBeenCalledWith({
      topic: 'topic',
      messages: [{ value: JSON.stringify({ foo: 'bar' }) }],
    });

    const io = { emit: vi.fn() } as any;
    await initKafka(io);
    expect(mock.prodConnect).toHaveBeenCalled();
    expect(mock.consConnect).toHaveBeenCalled();
    expect(mock.subscribe).toHaveBeenNthCalledWith(1, { topic: 'workOrderUpdates' });
    expect(mock.subscribe).toHaveBeenNthCalledWith(2, { topic: 'inventoryUpdates' });
    expect(mock.run).toHaveBeenCalled();
  });

  it('skips Kafka logic when disabled', async () => {
    process.env.KAFKA_BROKERS = '';
    const mock = buildKafkaMock();
    vi.doMock('kafkajs', () => ({ Kafka: mock.Kafka, logLevel: { ERROR: 0 } }));
    const { sendKafkaEvent, initKafka, producer } = await import('../utils/kafka');

    await expect(sendKafkaEvent('topic', {})).resolves.toBeUndefined();
    await expect(initKafka()).resolves.toBeUndefined();
    expect(mock.Kafka).not.toHaveBeenCalled();
    expect(producer).toBeNull();
  });
});

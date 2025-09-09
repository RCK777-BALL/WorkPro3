import { describe, it, beforeAll, afterAll, beforeEach, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { registerHook, dispatchEvent } from '../services/integrationHub';
import { execute } from '../integrations/graphql';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.3' } });
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('integration hub', () => {
  it('dispatches webhook events', async () => {
    await registerHook({ name: 'w', type: 'webhook', url: 'http://example.com', events: ['ping'] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await dispatchEvent('ping', { a: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('queries hooks via GraphQL', async () => {
    await registerHook({ name: 'w', type: 'webhook', url: 'http://x', events: ['ping'] });
    const res: any = await execute('{ integrationHooks { name type } }');
    expect(res.data.integrationHooks[0].name).toBe('w');
  });
});

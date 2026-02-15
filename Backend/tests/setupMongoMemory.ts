import { MongoMemoryServer } from 'mongodb-memory-server';

const FORCED_VERSION = '7.0.5';
const FORCED_OS = 'ubuntu2004';
const FORCED_DISTRO = 'ubuntu-20.04';

const applyForcedMongoEnv = () => {
  process.env.MONGOMS_VERSION = FORCED_VERSION;
  process.env.MONGOMS_OS = FORCED_OS;
  process.env.MONGOMS_DISTRO = FORCED_DISTRO;
  delete process.env.MONGOMS_SYSTEM_BINARY;
};

applyForcedMongoEnv();

const mongoMemory = MongoMemoryServer as unknown as {
  create: typeof MongoMemoryServer.create;
};
const originalCreate = mongoMemory.create.bind(MongoMemoryServer);

mongoMemory.create = ((opts?: Parameters<typeof MongoMemoryServer.create>[0]) => {
  applyForcedMongoEnv();
  const binary = { ...(opts?.binary ?? {}) };
  delete (binary as { systemBinary?: string }).systemBinary;

  return originalCreate({
    ...(opts ?? {}),
    binary: {
      ...binary,
      version: FORCED_VERSION,
    },
  });
}) as typeof MongoMemoryServer.create;


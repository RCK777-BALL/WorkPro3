/*
 * SPDX-License-Identifier: MIT
 */

import { Db, MongoClient } from 'mongodb';
import logger from '../../utils/logger';

async function ensureCollection(db: Db, name: string) {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    await db.createCollection(name);
  }
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    await ensureCollection(db, 'inventoryparts');
    await ensureCollection(db, 'inventorylocations');
    await ensureCollection(db, 'inventorystocklevels');
    await ensureCollection(db, 'inventorytransactions');

    await db.collection('inventoryparts').createIndexes([
      { key: { tenantId: 1, sku: 1 } },
      { key: { tenantId: 1, name: 1 } },
      { key: { tenantId: 1, status: 1 } },
    ]);

    await db.collection('inventorylocations').createIndexes([
      { key: { tenantId: 1, code: 1 }, unique: true },
      { key: { tenantId: 1, siteId: 1, store: 1, room: 1, bin: 1 }, unique: true },
      { key: { tenantId: 1, warehouse: 1 } },
    ]);

    await db.collection('inventorystocklevels').createIndexes([
      { key: { tenantId: 1, part: 1, bin: 1 }, unique: true },
      { key: { tenantId: 1, part: 1 } },
      { key: { tenantId: 1, bin: 1 } },
    ]);

    await db.collection('inventorytransactions').createIndexes([
      { key: { tenantId: 1, idempotency_key: 1 }, unique: true, partialFilterExpression: { idempotency_key: { $exists: true } } },
      { key: { tenantId: 1, part: 1, created_at: -1 } },
      { key: { tenantId: 1, from_bin: 1, created_at: -1 } },
      { key: { tenantId: 1, to_bin: 1, created_at: -1 } },
    ]);

    logger.info('Inventory entity migrations complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

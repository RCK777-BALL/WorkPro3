/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient } from 'mongodb';
import logger from '../../utils/logger';

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    const collectionName = 'downtimeevents';
    const exists = await db.listCollections({ name: collectionName }).hasNext();
    if (!exists) {
      await db.createCollection(collectionName);
    }

    const collection = db.collection(collectionName);

    await collection.createIndexes([
      { key: { tenantId: 1, assetId: 1, start: -1 } },
      { key: { tenantId: 1, workOrderId: 1 }, partialFilterExpression: { workOrderId: { $exists: true } } },
      { key: { tenantId: 1, start: -1 } },
    ]);

    logger.info('Downtime events migration completed');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

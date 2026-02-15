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

    await db.collection('inventoryparts').updateMany(
      {},
      [
        {
          $set: {
            min: { $ifNull: ['$min', { $ifNull: ['$minQty', { $ifNull: ['$minStock', 0] }] }] },
            max: { $ifNull: ['$max', { $ifNull: ['$maxQty', { $ifNull: ['$maxLevel', 0] }] }] },
            reorder: { $ifNull: ['$reorder', { $ifNull: ['$reorderPoint', 0] }] },
          },
        },
      ],
    );

    logger.info('Inventory part min/max/reorder migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

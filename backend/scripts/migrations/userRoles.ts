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
    await db.collection('users').updateMany(
      { roles: { $exists: false }, role: { $exists: true } },
      [
        { $set: { roles: ['$role'] } },
        { $unset: 'role' },
      ]
    );
    logger.info('userRoles migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

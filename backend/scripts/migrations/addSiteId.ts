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
    await db.collection('assets').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('inventoryitems').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('workorders').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('pmtasks').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('users').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('requestforms').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    logger.info('addSiteId migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

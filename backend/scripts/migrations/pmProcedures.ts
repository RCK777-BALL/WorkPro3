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

    await ensureCollection(db, 'pm_template_categories');
    await ensureCollection(db, 'pm_procedure_templates');
    await ensureCollection(db, 'pm_template_versions');

    await db.collection('pm_template_categories').createIndexes([
      { key: { tenantId: 1, name: 1 }, unique: true },
      { key: { tenantId: 1, siteId: 1 } },
    ]);

    await db.collection('pm_procedure_templates').createIndexes([
      { key: { tenantId: 1, name: 1 }, unique: true },
      { key: { tenantId: 1, category: 1 } },
      { key: { tenantId: 1, latestPublishedVersion: 1 } },
    ]);

    await db.collection('pm_template_versions').createIndexes([
      { key: { templateId: 1, versionNumber: 1 }, unique: true },
      { key: { templateId: 1, status: 1 } },
      { key: { status: 1 } },
    ]);

    logger.info('PM procedure template migrations complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

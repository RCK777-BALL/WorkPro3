/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId } from 'mongodb';
import logger from '../../utils/logger';

const DEFAULT_ADMIN_EMAILS = ['admin@cmms.com', 'admin@example.com'];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    const auditLogs = db.collection('auditlogs');

    const result = await users.updateMany(
      { email: { $in: DEFAULT_ADMIN_EMAILS } },
      {
        $set: { passwordExpired: true, bootstrapAccount: true, mfaEnabled: false },
        $unset: { mfaSecret: '' },
      },
    );

    logger.info(`expireBootstrapAdmins: marked ${result.modifiedCount} accounts as expired.`);

    const modified = await users
      .find({ email: { $in: DEFAULT_ADMIN_EMAILS } }, { projection: { tenantId: 1, email: 1 } })
      .toArray();

    const now = new Date();
    for (const user of modified) {
      const tenantId = user.tenantId instanceof ObjectId ? user.tenantId : undefined;
      if (!tenantId) continue;
      await auditLogs.insertOne({
        tenantId,
        action: 'bootstrap_mark_expired',
        entityType: 'user',
        entityId: user._id?.toString(),
        entity: { type: 'user', id: user._id?.toString(), label: user.email },
        before: null,
        after: { passwordExpired: true, bootstrapAccount: true },
        ts: now,
      });
    }
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});


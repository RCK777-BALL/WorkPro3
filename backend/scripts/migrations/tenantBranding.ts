/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId } from 'mongodb';
import logger from '../../utils/logger';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-');

const domainFromTenant = (tenant: { _id: ObjectId; slug?: string; name?: string; domain?: string }) => {
  if (tenant.domain) return tenant.domain;
  if (tenant.slug) return `${tenant.slug}.local`; // keep deterministic for local/dev
  if (tenant.name) return `${slugify(tenant.name)}.local`;
  return `tenant-${tenant._id.toString().slice(-6)}.local`;
};

export async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/WorkPro3';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const tenants = await db.collection('tenants').find({}).toArray();

    for (const tenant of tenants) {
      const domain = domainFromTenant(tenant as any);
      await db.collection('tenants').updateOne(
        { _id: tenant._id },
        {
          $setOnInsert: { branding: {} },
          $set: { domain },
        },
      );
    }

    // Ensure sites created without tenant reference are backfilled to avoid cross-tenant leakage
    const firstTenantId = tenants[0]?._id;
    if (firstTenantId) {
      await db
        .collection('sites')
        .updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: firstTenantId } });
    }

    logger.info('tenantBranding migration complete');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  run().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}


/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId } from 'mongodb';
import logger from '../../utils/logger';

type TenantContext = {
  defaultTenant?: ObjectId;
  defaultSiteByTenant: Map<string, ObjectId>;
  siteTenant: Map<string, ObjectId>;
};

const resolveContext = async (db: ReturnType<MongoClient['db']>): Promise<TenantContext> => {
  const siteTenant = new Map<string, ObjectId>();
  const defaultSiteByTenant = new Map<string, ObjectId>();

  const sites = await db.collection('sites').find({ tenantId: { $exists: true } }).toArray();
  for (const site of sites) {
    if (!site._id || !site.tenantId) continue;
    siteTenant.set(site._id.toString(), new ObjectId(site.tenantId));
    if (!defaultSiteByTenant.has(site.tenantId.toString())) {
      defaultSiteByTenant.set(site.tenantId.toString(), new ObjectId(site._id));
    }
  }

  const defaultTenantDoc = await db.collection('tenants').findOne({}, { projection: { _id: 1 } });

  return {
    defaultTenant: defaultTenantDoc?._id ? new ObjectId(defaultTenantDoc._id) : undefined,
    defaultSiteByTenant,
    siteTenant,
  };
};

const backfillCollection = async (
  db: ReturnType<MongoClient['db']>,
  collectionName: string,
  context: TenantContext,
  tenantField = 'tenantId',
  siteField = 'siteId',
) => {
  const collection = db.collection(collectionName);
  const cursor = collection.find({
    $or: [{ [tenantField]: { $exists: false } }, { [siteField]: { $exists: false } }],
  });

  const bulk = collection.initializeUnorderedBulkOp();
  let updates = 0;

  // eslint-disable-next-line no-await-in-loop -- intentional cursor iteration
  for await (const doc of cursor) {
    let tenantId: ObjectId | undefined = doc[tenantField];
    let siteId: ObjectId | undefined = doc[siteField];

    if (!tenantId && siteId) {
      const resolved = context.siteTenant.get(siteId.toString());
      if (resolved) {
        tenantId = resolved;
      }
    }

    if (!tenantId && context.defaultTenant) {
      tenantId = context.defaultTenant;
    }

    if (!siteId && tenantId) {
      const fallbackSite = context.defaultSiteByTenant.get(tenantId.toString());
      if (fallbackSite) {
        siteId = fallbackSite;
      }
    }

    const update: Record<string, ObjectId> = {};
    if (tenantId && !doc[tenantField]) {
      update[tenantField] = tenantId;
    }
    if (siteId && !doc[siteField]) {
      update[siteField] = siteId;
    }

    if (Object.keys(update).length > 0) {
      bulk.find({ _id: doc._id }).updateOne({ $set: update });
      updates += 1;
    }
  }

  if (updates === 0) {
    logger.info(`${collectionName}: no documents required updates`);
    return;
  }

  await bulk.execute();
  logger.info(`${collectionName}: backfilled tenant/site fields for ${updates} documents`);
};

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const context = await resolveContext(db);

    await backfillCollection(db, 'assets', context);
    await backfillCollection(db, 'inventoryitems', context);
    await backfillCollection(db, 'workorders', context);
    await backfillCollection(db, 'requestforms', context);
    await backfillCollection(db, 'comments', context, 'tenantId', 'siteId');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

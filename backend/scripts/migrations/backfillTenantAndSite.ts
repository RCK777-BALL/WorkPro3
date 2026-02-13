/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId, type Collection, type Db } from 'mongodb';
import logger from '../../utils/logger';

type WithTenant = { _id: ObjectId; tenantId?: ObjectId | null; plant?: ObjectId | null; siteId?: ObjectId | null };

type PlantRef = { _id: ObjectId; tenantId?: ObjectId | null };

type WorkOrderRef = { _id: ObjectId; tenantId?: ObjectId | null; plant?: ObjectId | null; siteId?: ObjectId | null };

const DEFAULT_URI = 'mongodb://localhost:27017/workpro';

async function resolveFallbackTenant(db: Db): Promise<ObjectId> {
  const existing = await db.collection('tenants').findOne();
  if (existing?._id) {
    return existing._id as ObjectId;
  }

  const fallback = new ObjectId();
  await db.collection('tenants').insertOne({
    _id: fallback,
    name: 'Default Tenant',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  logger.warn('No tenants found; created default tenant for backfill', { fallback });
  return fallback;
}

const toObjectId = (value: unknown): ObjectId | undefined => {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && ObjectId.isValid(value)) return new ObjectId(value);
  return undefined;
};

async function buildPlantTenantMap(db: Db): Promise<Map<string, ObjectId>> {
  const plants = await db.collection<PlantRef>('plants').find({}, { projection: { tenantId: 1 } }).toArray();
  const map = new Map<string, ObjectId>();
  plants.forEach((plant) => {
    const tenant = toObjectId(plant.tenantId);
    if (tenant) {
      map.set(plant._id.toString(), tenant);
    }
  });
  return map;
}

async function buildWorkOrderTenantMap(db: Db): Promise<Map<string, ObjectId>> {
  const workOrders = await db
    .collection<WorkOrderRef>('workorders')
    .find({}, { projection: { tenantId: 1, plant: 1 } })
    .toArray();
  const map = new Map<string, ObjectId>();
  workOrders.forEach((wo) => {
    const tenant = toObjectId(wo.tenantId) ?? toObjectId(wo.plant);
    if (tenant) {
      map.set(wo._id.toString(), tenant);
    }
  });
  return map;
}

async function backfillMissingTenant(
  collection: Collection<WithTenant>,
  fallbackTenantId: ObjectId,
  tenantLookup?: (doc: WithTenant) => ObjectId | undefined,
) {
  const cursor = collection.find({ tenantId: { $exists: false } });
  let updated = 0;
  for await (const doc of cursor) {
    const inferredTenant = tenantLookup?.(doc);
    await collection.updateOne(
      { _id: doc._id },
      { $set: { tenantId: inferredTenant ?? fallbackTenantId, siteId: doc.siteId ?? null } },
    );
    updated += 1;
  }

  const nullTenant = await collection.updateMany({ tenantId: null }, { $set: { tenantId: fallbackTenantId } });
  const missingSite = await collection.updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });

  if (updated || nullTenant.modifiedCount || missingSite.modifiedCount) {
    logger.info('Backfill update summary', {
      collection: collection.collectionName,
      missingTenantUpdated: updated,
      nullTenantUpdated: nullTenant.modifiedCount,
      siteDefaults: missingSite.modifiedCount,
    });
  }
}

async function run() {
  const uri = process.env.MONGO_URI || DEFAULT_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const fallbackTenant = await resolveFallbackTenant(db);
    const plantTenantMap = await buildPlantTenantMap(db);
    const workOrderTenantMap = await buildWorkOrderTenantMap(db);

    await backfillMissingTenant(db.collection<WithTenant>('assets'), fallbackTenant, (doc) => {
      const plantTenant = doc.plant ? plantTenantMap.get(doc.plant.toString()) : undefined;
      return plantTenant ?? undefined;
    });

    await backfillMissingTenant(db.collection<WithTenant>('workorders'), fallbackTenant, (doc) => {
      const plantTenant = doc.plant ? plantTenantMap.get(doc.plant.toString()) : undefined;
      return plantTenant ?? undefined;
    });

    await backfillMissingTenant(db.collection<WithTenant>('permits'), fallbackTenant, (doc) => {
      if (doc.tenantId) return toObjectId(doc.tenantId);
      const workOrderTenant = doc.plant ? plantTenantMap.get(doc.plant.toString()) : undefined;
      return workOrderTenant;
    });

    await backfillMissingTenant(db.collection<WithTenant>('auditlogs'), fallbackTenant);
    await backfillMissingTenant(db.collection<WithTenant>('inventoryitems'), fallbackTenant, (doc) => {
      const plantTenant = doc.plant ? plantTenantMap.get(doc.plant.toString()) : undefined;
      return plantTenant;
    });

    await backfillMissingTenant(db.collection<WithTenant>('requestforms'), fallbackTenant, (doc) => {
      const plantTenant = doc.plant ? plantTenantMap.get(doc.plant.toString()) : undefined;
      return plantTenant;
    });

    const workRequestLookup = (doc: WithTenant) =>
      doc.tenantId ? toObjectId(doc.tenantId) : doc._id ? workOrderTenantMap.get(doc._id.toString()) : undefined;

    await backfillMissingTenant(db.collection<WithTenant>('workrequests'), fallbackTenant, workRequestLookup);
    logger.info('backfillTenantAndSite migration complete');
  } catch (error) {
    logger.error('backfillTenantAndSite migration failed', error);
    throw error;
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

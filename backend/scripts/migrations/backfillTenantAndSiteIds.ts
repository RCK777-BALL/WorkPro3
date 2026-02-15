/*
 * SPDX-License-Identifier: MIT
 */

import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import Tenant from '../../models/Tenant';
import Site from '../../models/Site';
import logger from '../../utils/logger';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';

const toObjectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ObjectId provided: ${value}`);
  }
  return new Types.ObjectId(value);
};

const resolveDefaultTenant = async (): Promise<Types.ObjectId> => {
  const envTenant = process.env.DEFAULT_TENANT_ID;
  if (envTenant) {
    logger.info('Using DEFAULT_TENANT_ID from environment');
    return toObjectId(envTenant);
  }

  const existing = await Tenant.findOne().select('_id').lean();
  if (existing?._id) {
    logger.info('Found existing tenant to use for backfill');
    return existing._id;
  }

  const created = await Tenant.create({ name: 'Default Tenant' });
  logger.info('Created fallback tenant for backfill', { tenantId: created._id.toString() });
  return created._id;
};

const resolveDefaultSite = async (tenantId: Types.ObjectId): Promise<Types.ObjectId> => {
  const existing = await Site.findOne({ tenantId }).select('_id').lean();
  if (existing?._id) {
    return existing._id;
  }

  const created = await Site.create({ tenantId, name: 'Primary Site' });
  logger.info('Created fallback site for backfill', {
    tenantId: tenantId.toString(),
    siteId: created._id.toString(),
  });
  return created._id;
};

const backfillCollection = async (
  collectionName: string,
  tenantId: Types.ObjectId,
  siteId: Types.ObjectId,
) => {
  const collection = mongoose.connection.collection(collectionName);
  const tenantFilter = { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] };
  const siteFilter = { $or: [{ siteId: { $exists: false } }, { siteId: null }] };

  const { matchedCount: tenantMatched, modifiedCount: tenantModified } = await collection.updateMany(
    tenantFilter,
    { $set: { tenantId } },
  );

  const { matchedCount: siteMatched, modifiedCount: siteModified } = await collection.updateMany(
    siteFilter,
    { $set: { siteId } },
  );

  logger.info('Backfill complete for collection', {
    collection: collectionName,
    tenantMatched,
    tenantModified,
    siteMatched,
    siteModified,
  });
};

async function run() {
  await mongoose.connect(MONGO_URI);
  logger.info('Connected to MongoDB for backfill');

  const tenantId = await resolveDefaultTenant();
  const siteId = await resolveDefaultSite(tenantId);

  const collections = ['assets', 'inventoryitems', 'workorders', 'requestforms', 'auditevents'];
  for (const collection of collections) {
    await backfillCollection(collection, tenantId, siteId);
  }

  logger.info('Tenant/site backfill completed successfully');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  logger.error('Backfill failed', error);
  await mongoose.disconnect();
  process.exit(1);
});

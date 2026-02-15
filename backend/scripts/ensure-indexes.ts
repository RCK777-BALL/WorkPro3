/*
 * SPDX-License-Identifier: MIT
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';

dotenv.config();

const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/workpro';

async function run(): Promise<void> {
  await mongoose.connect(uri);
  const models = [WorkOrder, Asset];

  for (const model of models) {
    const created = await model.syncIndexes();
    logger.info('index_sync_complete', { model: model.modelName, createdOrDropped: created });
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  logger.error('index_sync_failed', { error });
  process.exit(1);
});

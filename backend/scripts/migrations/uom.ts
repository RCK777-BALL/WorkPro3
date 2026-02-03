/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId } from 'mongodb';
import logger from '../../utils/logger';

export async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/WorkPro3';
  const client = new MongoClient(uri);

  const eachId = new ObjectId();
  const caseId = new ObjectId();

  try {
    await client.connect();
    const db = client.db();

    await db.collection('unitOfMeasure').insertMany([
      { _id: eachId, name: 'Each', abbr: 'ea' },
      { _id: caseId, name: 'Case', abbr: 'case' },
    ]);

    await db.collection('conversions').insertMany([
      { from: caseId, to: eachId, factor: 12 },
      { from: eachId, to: caseId, factor: 1 / 12 },
    ]);

    logger.info('UoM migration complete');
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


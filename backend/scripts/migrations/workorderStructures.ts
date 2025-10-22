/*
 * SPDX-License-Identifier: MIT
 */

import { MongoClient, ObjectId } from 'mongodb';
import logger from '../../utils/logger';

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('workorders');
    const cursor = collection.find({});
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;
      const set: any = {};
      const unset: any = {};
      if (Array.isArray(doc.checklists) && doc.checklists.length > 0 && typeof doc.checklists[0] === 'string') {
        set.checklists = doc.checklists.map((text: string) => ({ text, done: false }));
      }
      if (Array.isArray(doc.partsUsed) && doc.partsUsed.length > 0 && !doc.partsUsed[0]?.partId) {
        set.partsUsed = doc.partsUsed.map((p: any) => ({ partId: new ObjectId(p), qty: 1, cost: 0 }));
      }
      if (!Array.isArray(doc.signatures)) {
        set.signatures = [];
      }
      if (doc.signature !== undefined) {
        unset.signature = '';
      }
      if (Object.keys(set).length || Object.keys(unset).length) {
        const update: any = {};
        if (Object.keys(set).length) update.$set = set;
        if (Object.keys(unset).length) update.$unset = unset;
        await collection.updateOne({ _id: doc._id }, update);
      }
    }
    logger.info('workorderStructures migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});

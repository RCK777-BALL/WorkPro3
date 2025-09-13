/*
 * SPDX-License-Identifier: MIT
 */

import mongoose from 'mongoose';
import WorkOrder from '../models/WorkOrder';

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/cmms';
  await mongoose.connect(uri);
  const workOrders = await WorkOrder.find();
  for (const wo of workOrders) {
    // convert checklists from string[] to objects
    if (Array.isArray((wo as any).checklists) && typeof (wo as any).checklists[0] === 'string') {
      (wo as any).checklists = (wo as any).checklists.map((c: string) => ({ description: c, completed: false }));
    }
    // convert partsUsed from ObjectId[] to part lines
    if (Array.isArray((wo as any).partsUsed) && typeof (wo as any).partsUsed[0] !== 'object') {
      (wo as any).partsUsed = (wo as any).partsUsed.map((p: any) => ({ partId: p, quantity: 1 }));
    }
    // ensure signatures array exists
    if (!Array.isArray((wo as any).signatures)) {
      (wo as any).signatures = [];
    }
    // rename asset to assetId
    if ((wo as any).asset && !(wo as any).assetId) {
      (wo as any).assetId = (wo as any).asset;
      (wo as any).asset = undefined;
    }
    await wo.save();
  }
  await mongoose.disconnect();
}

run().then(() => {
  console.log('Migration complete');
});

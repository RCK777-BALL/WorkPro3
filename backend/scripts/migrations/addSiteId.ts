import { MongoClient } from 'mongodb';

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    await db.collection('assets').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('inventoryitems').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    await db.collection('requestforms').updateMany({ siteId: { $exists: false } }, { $set: { siteId: null } });
    console.log('addSiteId migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

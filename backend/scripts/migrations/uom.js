const { MongoClient, ObjectId } = require('mongodb');

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/workpro';
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

    console.log('UoM migration complete');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

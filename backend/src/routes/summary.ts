import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(503).json({ status: 'error', message: 'Database not connected' });
      return;
    }

    const collections = await db.listCollections().toArray();
    const summary: Record<string, number> = {};

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      summary[col.name] = count;
    }

    res.json({
      status: 'ok',
      uptime: `${process.uptime().toFixed(0)}s`,
      collections: summary,
      time: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', message });
  }
});

export default router;

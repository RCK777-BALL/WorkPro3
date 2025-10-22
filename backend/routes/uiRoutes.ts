/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";
import mongoose from "mongoose";
import os from "os";

const router = Router();

router.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const mem = process.memoryUsage();

  res.json({
    status: "ok",
    uptime: `${Math.round(process.uptime())}s`,
    database: dbState,
    memory: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    host: os.hostname(),
    time: new Date().toISOString(),
  });
});

router.get("/system/summary", async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(503).json({ status: "error", message: "Database not connected" });
      return;
    }

    const collections = await db.listCollections().toArray();
    const summary: Record<string, number> = {};

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      summary[col.name] = count;
    }

    res.json({
      status: "ok",
      uptime: `${Math.round(process.uptime())}s`,
      collections: summary,
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;

import express from "express";
import os from "os";
import mongoose from "mongoose";
const router = express.Router();
router.get("/", (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    uptime: process.uptime().toFixed(0) + "s",
    database: dbState,
    memory: Math.round(mem.rss / 1024 / 1024) + " MB",
    host: os.hostname(),
    time: new Date().toISOString(),
  });
});
export default router;

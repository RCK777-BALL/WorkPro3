import express from "express";
import os from "os";
import mongoose from "mongoose";

const router = express.Router();

const getDbState = () =>
  mongoose.connection.readyState === 1 ? "connected" : "disconnected";

router.get("/", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    uptime: `${process.uptime().toFixed(0)}s`,
    database: getDbState(),
    memory: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    host: os.hostname(),
    time: new Date().toISOString(),
  });
});

router.get("/live", (_req, res) => {
  res.status(200).json({ status: "live", time: new Date().toISOString() });
});

router.get("/ready", (_req, res) => {
  const dbState = getDbState();
  if (dbState !== "connected") {
    res.status(503).json({ status: "not_ready", database: dbState });
    return;
  }
  res.status(200).json({ status: "ready", database: dbState });
});

export default router;

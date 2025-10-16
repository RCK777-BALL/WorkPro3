/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyAnalyticsRoutes from "./analyticsRoutes";

const router = Router();

const kpis = {
  completionRate: 92,
  mttr: 4.2,
  backlog: 17,
};

const trend = [
  { date: "2024-06-01", created: 6, completed: 4 },
  { date: "2024-06-02", created: 5, completed: 5 },
  { date: "2024-06-03", created: 4, completed: 6 },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: { kpis, trend }, message: "Analytics summary" });
});

router.get("/kpis", (_req, res) => {
  res.json(kpis);
});

router.get("/trends", (_req, res) => {
  res.json(trend);
});

router.use("/", legacyAnalyticsRoutes);

export default router;

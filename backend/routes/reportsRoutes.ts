/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
  getLongTermTrends,
  getAiSummary,
  getReportSchedule,
  updateReportSchedule,
} from "../controllers/ReportsController";

import legacyReportsRoutes from "./ReportsLegacyRoutes";

const router = Router();

const summary = [
  {
    id: "report-001",
    name: "Monthly Work Order Summary",
    owner: "Operations",
    lastRun: "2024-06-01",
  },
  {
    id: "report-002",
    name: "PM Compliance",
    owner: "Maintenance",
    lastRun: "2024-05-30",
  },
  {
    id: "report-003",
    name: "Inventory Reorder",
    owner: "Supply Chain",
    lastRun: "2024-06-04",
  },
];

router.use((req, _res, next) => {
  if (!req.tenantId && typeof req.headers["x-tenant-id"] === "string") {
    req.tenantId = req.headers["x-tenant-id"];
  }
  next();
});

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Reports summary" });
});

router.get("/analytics", getAnalyticsReport);
router.get("/download", downloadReport);
router.get("/trends", getTrendData);
router.get("/trends/export", exportTrendData);
router.get("/costs", getCostMetrics);
router.get("/downtime", getDowntimeReport);
router.get("/pm-compliance", getPmCompliance);
router.get("/cost-by-asset", getCostByAsset);
router.get("/long-term-trends", getLongTermTrends);
router.get("/summary/ai", getAiSummary);
router.get("/schedule", getReportSchedule);
router.post("/schedule", updateReportSchedule);

router.use("/", legacyReportsRoutes);

export default router;

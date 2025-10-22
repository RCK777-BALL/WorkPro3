/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

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

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Reports summary" });
});

router.use("/", legacyReportsRoutes);

export default router;

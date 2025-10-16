/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import auditRoutes from "./AuditRoutes";

const router = Router();

const audits = [
  {
    id: "audit-001",
    module: "Permits",
    action: "Approved permit PR-88",
    actor: "Kim Romero",
    timestamp: "2024-06-05T17:26:00Z",
    status: "Completed",
  },
  {
    id: "audit-002",
    module: "Work Orders",
    action: "Updated priority on WO-231",
    actor: "Jordan Chen",
    timestamp: "2024-06-05T13:08:00Z",
    status: "In Progress",
  },
  {
    id: "audit-003",
    module: "Inventory",
    action: "Adjusted quantity for Bearing 6203-ZZ",
    actor: "Avery Johnson",
    timestamp: "2024-06-04T08:54:00Z",
    status: "Open",
  },
];

router.get("/", (_req, res) => {
  res.json({ success: true, data: audits, message: "Compliance audit logs" });
});

router.use("/audit", auditRoutes);

export default router;

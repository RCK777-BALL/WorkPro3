/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyIntegrationRoutes from "./IntegrationLegacyRoutes";

const router = Router();

const summary = [
  {
    id: "integration-001",
    integration: "SAP ERP",
    type: "Work Order Sync",
    status: "In Progress",
    lastSync: "2024-06-06T05:15:00Z",
  },
  {
    id: "integration-002",
    integration: "Power BI",
    type: "Analytics Feed",
    status: "Completed",
    lastSync: "2024-06-05T22:00:00Z",
  },
  {
    id: "integration-003",
    integration: "Twilio SMS",
    type: "Notifications",
    status: "Open",
    lastSync: "2024-06-04T14:33:00Z",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Integration summary" });
});

router.use("/", legacyIntegrationRoutes);

export default router;

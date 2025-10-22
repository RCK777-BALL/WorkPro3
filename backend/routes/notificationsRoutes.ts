/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyNotificationsRoutes from "./NotificationsLegacyRoutes";

const router = Router();

const summary = [
  {
    id: "notify-001",
    message: "Work order WO-231 was completed.",
    channel: "In-App",
    createdAt: "2024-06-06T09:14:00Z",
    status: "Completed",
  },
  {
    id: "notify-002",
    message: "Permit PR-88 awaiting approval.",
    channel: "Email",
    createdAt: "2024-06-05T17:24:00Z",
    status: "Pending Approval",
  },
  {
    id: "notify-003",
    message: "Inventory low on Bearing 6203-ZZ.",
    channel: "SMS",
    createdAt: "2024-06-05T08:45:00Z",
    status: "Open",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Notification summary" });
});

router.use("/", legacyNotificationsRoutes);

export default router;

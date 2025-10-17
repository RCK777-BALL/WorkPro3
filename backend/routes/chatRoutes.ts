/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyChatRoutes from "./ChatRoutesLegacy";

const router = Router();

const summary = [
  {
    id: "chat-001",
    thread: "Line A - Shift Handoff",
    participants: ["Avery", "Jordan", "Priya"],
    lastMessage: "Night shift logged motor vibration spike.",
    updatedAt: "2024-06-06T07:45:00Z",
    status: "Open",
  },
  {
    id: "chat-002",
    thread: "Safety Permit Review",
    participants: ["Kim", "Safety Team"],
    lastMessage: "Awaiting approval from EHS lead.",
    updatedAt: "2024-06-05T15:10:00Z",
    status: "Pending Approval",
  },
  {
    id: "chat-003",
    thread: "PM Optimization",
    participants: ["Reliability", "Maintenance"],
    lastMessage: "Updated lubrication cadence shared.",
    updatedAt: "2024-06-04T11:02:00Z",
    status: "Completed",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Chat summary" });
});

router.use("/", legacyChatRoutes);

export default router;

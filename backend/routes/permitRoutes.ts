/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyPermitRoutes from "./PermitRoutes";

const router = Router();

const summary = [
  {
    id: "PR-088",
    type: "Hot Work",
    requester: "Kim Romero",
    status: "Pending Approval",
    createdAt: "2024-06-05",
  },
  {
    id: "PR-074",
    type: "Confined Space",
    requester: "Jordan Chen",
    status: "In Progress",
    createdAt: "2024-06-02",
  },
  {
    id: "PR-069",
    type: "Lockout/Tagout",
    requester: "Avery Johnson",
    status: "Completed",
    createdAt: "2024-05-29",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Permit summary" });
});

router.use("/", legacyPermitRoutes);

export default router;

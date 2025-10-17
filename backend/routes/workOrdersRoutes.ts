/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyWorkOrderRoutes from "./WorkOrderLegacyRoutes";

const router = Router();

const summary = [
  {
    id: "WO-231",
    title: "Replace belt on conveyor A",
    status: "Open",
    priority: "High",
    dueDate: "2024-06-07",
    assignee: "Avery Johnson",
  },
  {
    id: "WO-229",
    title: "Inspect boiler relief valves",
    status: "In Progress",
    priority: "Medium",
    dueDate: "2024-06-09",
    assignee: "Jordan Chen",
  },
  {
    id: "WO-224",
    title: "Calibrate packaging line scales",
    status: "Completed",
    priority: "Low",
    dueDate: "2024-06-01",
    assignee: "Priya Das",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Work order summary" });
});

router.use("/", legacyWorkOrderRoutes);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyPmRoutes from "./PMTaskRoutes";

const router = Router();

const summary = [
  {
    id: "PM-105",
    task: "Lubricate gearbox - Line A",
    asset: "Packaging Line A",
    frequency: "Monthly",
    nextDue: "2024-06-10",
    status: "Open",
  },
  {
    id: "PM-212",
    task: "Inspect HVAC filters",
    asset: "Warehouse AHU",
    frequency: "Quarterly",
    nextDue: "2024-07-05",
    status: "In Progress",
  },
  {
    id: "PM-338",
    task: "Test emergency generators",
    asset: "Generator 2",
    frequency: "Annually",
    nextDue: "2024-09-01",
    status: "Pending Approval",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Preventive maintenance summary" });
});

router.use("/", legacyPmRoutes);

export default router;

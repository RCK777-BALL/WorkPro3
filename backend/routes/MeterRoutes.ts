/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyMeterRoutes from "./MeterLegacyRoutes";

const router = Router();

const summary = [
  {
    id: "meter-001",
    meter: "Runtime Hours",
    asset: "Boiler #2",
    lastReading: 11820,
    readingDate: "2024-06-01",
    status: "Open",
  },
  {
    id: "meter-002",
    meter: "Cycle Count",
    asset: "Press Line C",
    lastReading: 870,
    readingDate: "2024-06-05",
    status: "In Progress",
  },
  {
    id: "meter-003",
    meter: "Differential Pressure",
    asset: "Filter Bank A",
    lastReading: 5.6,
    readingDate: "2024-06-03",
    status: "Completed",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Meter summary" });
});

router.use("/", legacyMeterRoutes);

export default router;

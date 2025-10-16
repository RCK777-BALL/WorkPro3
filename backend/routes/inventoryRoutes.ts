/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyInventoryRoutes from "./InventoryRoutes";

const router = Router();

const summary = [
  {
    id: "INV-001",
    item: "Hydraulic Hose 1in",
    category: "Hydraulics",
    onHand: 18,
    reorderPoint: 10,
    status: "Open",
  },
  {
    id: "INV-014",
    item: "Bearing 6203-ZZ",
    category: "Mechanical",
    onHand: 6,
    reorderPoint: 12,
    status: "On Hold",
  },
  {
    id: "INV-020",
    item: "Filter Cartridge 5μm",
    category: "Consumables",
    onHand: 42,
    reorderPoint: 20,
    status: "Completed",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Inventory summary" });
});

router.use("/", legacyInventoryRoutes);

export default router;

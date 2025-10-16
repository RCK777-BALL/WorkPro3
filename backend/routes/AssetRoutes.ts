/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyAssetRoutes from "./assetRoutes";

const router = Router();

const summary = [
  {
    id: "AS-1001",
    name: "Main Air Compressor",
    location: "Plant 1",
    category: "Utilities",
    status: "Open",
  },
  {
    id: "AS-1042",
    name: "Packaging Line B",
    location: "Plant 1",
    category: "Production",
    status: "In Progress",
  },
  {
    id: "AS-1103",
    name: "Warehouse Forklift 3",
    location: "Distribution",
    category: "Material Handling",
    status: "Completed",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Asset summary" });
});

router.use("/", legacyAssetRoutes);

export default router;

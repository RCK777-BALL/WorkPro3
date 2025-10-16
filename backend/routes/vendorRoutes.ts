/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import legacyVendorRoutes from "./VendorRoutes";

const router = Router();

const summary = [
  {
    id: "VEN-001",
    vendor: "ProParts Supply",
    category: "MRO",
    spendYtd: 18500,
    nextReview: "2024-07-30",
    status: "Open",
  },
  {
    id: "VEN-002",
    vendor: "Northwind Safety",
    category: "PPE",
    spendYtd: 8200,
    nextReview: "2024-09-12",
    status: "In Progress",
  },
  {
    id: "VEN-003",
    vendor: "Metro Automation",
    category: "Controls",
    spendYtd: 23200,
    nextReview: "2024-08-04",
    status: "Completed",
  },
];

router.get("/summary", (_req, res) => {
  res.json({ success: true, data: summary, message: "Vendor summary" });
});

router.use("/", legacyVendorRoutes);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import tenantRoutes from "./TenantRoutes";

const router = Router();

const settings = [
  {
    id: "admin-001",
    setting: "Site Configuration",
    description: "Manage sites, locations, and asset hierarchies",
    owner: "System Admin",
    status: "Open",
  },
  {
    id: "admin-002",
    setting: "Role Permissions",
    description: "Adjust user roles and access control policies",
    owner: "Security",
    status: "In Progress",
  },
  {
    id: "admin-003",
    setting: "API Access",
    description: "Rotate API keys and webhook endpoints",
    owner: "Platform",
    status: "Completed",
  },
];

router.get("/", (_req, res) => {
  res.json({ success: true, data: settings, message: "Admin settings" });
});

router.use("/tenants", tenantRoutes);

export default router;

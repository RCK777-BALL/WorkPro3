/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

const router = Router();

const articles = [
  {
    id: "kb-001",
    title: "Lockout/Tagout Procedure",
    category: "Safety",
    owner: "Safety Team",
    updatedAt: "2024-05-12",
  },
  {
    id: "kb-002",
    title: "Boiler Startup Checklist",
    category: "Operations",
    owner: "Maintenance",
    updatedAt: "2024-04-28",
  },
  {
    id: "kb-003",
    title: "Emergency Response Contacts",
    category: "Emergency",
    owner: "Facilities",
    updatedAt: "2024-06-06",
  },
];

router.get("/", (_req, res) => {
  res.json({ success: true, data: articles, message: "Knowledge base" });
});

export default router;

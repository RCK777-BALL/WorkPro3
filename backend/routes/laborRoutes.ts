/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

const router = Router();

const technicians = [
  {
    id: "tech-001",
    name: "Avery Johnson",
    role: "Maintenance Lead",
    certifications: ["CMRP", "Lockout/Tagout"],
    shift: "Day",
    status: "Open",
  },
  {
    id: "tech-002",
    name: "Jordan Chen",
    role: "Reliability Engineer",
    certifications: ["Vibration Analysis"],
    shift: "Swing",
    status: "In Progress",
  },
  {
    id: "tech-003",
    name: "Priya Das",
    role: "Field Technician",
    certifications: ["HVAC", "EPA 608"],
    shift: "Night",
    status: "On Hold",
  },
];

router.get("/", (_req, res) => {
  res.json({ success: true, data: technicians, message: "Labor roster" });
});

export default router;

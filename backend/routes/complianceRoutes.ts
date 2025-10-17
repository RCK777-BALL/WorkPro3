/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from "express";

import auditRoutes from "./AuditRoutes";
import { requireAuth } from "../middleware/authMiddleware";
import AuditLog from "../models/AuditLog";
import type { AuditLogDocument } from "../models/AuditLog";
import type { UserDocument } from "../models/User";
import { sendResponse } from "../utils/sendResponse";

const router = Router();

router.use(requireAuth);

const MODULE_LABELS: Record<string, string> = {
  WorkOrder: "Work Orders",
  WorkHistory: "Work History",
  Permit: "Permits",
  Document: "Documents",
  Part: "Inventory",
  Asset: "Assets",
  Vendor: "Vendors",
  Notification: "Notifications",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  approve: "Approved",
  assign: "Assigned",
  start: "Started",
  complete: "Completed",
  cancel: "Cancelled",
  import: "Imported",
  "import.sync": "Synced",
};

const toTitleCase = (value: string) =>
  value
    .split(/[_\s.-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ") || value;

const actionLabelFor = (action?: string) => {
  if (!action) return "Logged";
  return ACTION_LABELS[action] ?? toTitleCase(action);
};

const moduleLabelFor = (entityType?: string) => {
  if (!entityType) return "General";
  return MODULE_LABELS[entityType] ?? entityType;
};

const summarizeChange = (
  before: AuditLogDocument["before"],
  after: AuditLogDocument["after"],
): string | null => {
  if (!before && !after) {
    return null;
  }
  if (!before && after) {
    return "Initial values recorded";
  }
  if (before && !after) {
    return "Record removed";
  }

  if (!before || !after) {
    return null;
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = Array.from(keys).filter((key) => {
    const a = before[key as keyof typeof before];
    const b = after[key as keyof typeof after];
    return JSON.stringify(a) !== JSON.stringify(b);
  });

  if (changed.length === 0) {
    return null;
  }

  if (changed.length <= 3) {
    return `Updated ${changed.join(", ")}`;
  }

  return `Updated ${changed.length} fields`;
};

router.get<
  Record<string, unknown>,
  unknown,
  unknown,
  { limit?: string; module?: string; entityType?: string }
>("/", async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, "Tenant ID required", 400);
      return;
    }

    const normalizeQuery = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] : value;
    const limitParam = normalizeQuery(req.query.limit) ?? "50";
    const limit = Math.min(parseInt(limitParam, 10) || 50, 200);
    const entityType = normalizeQuery(req.query.module ?? req.query.entityType);

    const filter: Record<string, unknown> = { tenantId };
    if (entityType) {
      filter.entityType = entityType;
    }

    const logs = await AuditLog.find(filter)
      .sort({ ts: -1 })
      .limit(limit)
      .populate({ path: "userId", select: "name email" })
      .lean();

    const normalized = logs.map((log) => {
      const populatedUser = log.userId as unknown as UserDocument | undefined;
      const actor = populatedUser?.name ?? populatedUser?.email ?? "System";
      const actionLabel = actionLabelFor(log.action);
      const module = moduleLabelFor(log.entityType);
      const summaryParts = [actionLabel, log.entityType ?? "Record"];
      if (log.entityId) {
        summaryParts.push(String(log.entityId));
      }

      return {
        id: String(log._id),
        module,
        action: actionLabel,
        actor,
        timestamp: log.ts ? new Date(log.ts).toISOString() : new Date().toISOString(),
        status: actionLabel,
        entityType: log.entityType ?? "Record",
        entityId: log.entityId ? String(log.entityId) : undefined,
        summary: summaryParts.join(" "),
        changeSummary: summarizeChange(log.before, log.after),
        before: log.before ?? null,
        after: log.after ?? null,
      };
    });

    sendResponse(res, normalized, "Compliance audit logs");
  } catch (error) {
    next(error);
  }
});

router.use("/audit", auditRoutes);

export default router;

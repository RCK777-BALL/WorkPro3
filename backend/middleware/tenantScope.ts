/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

type MaybeString = string | undefined;

const toStringOrUndefined = (value: unknown): MaybeString => {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return undefined;
};

const tenantScope = (req: Request, res: Response, next: NextFunction): void => {
  const headerTenant = req.header("x-tenant-id");
  const userTenant = toStringOrUndefined(req.user?.tenantId);
  const existingTenant = toStringOrUndefined(req.tenantId);
  const envTenant = toStringOrUndefined(process.env.DEFAULT_TENANT_ID);

  const resolvedTenant =
    existingTenant ||
    toStringOrUndefined(headerTenant) ||
    userTenant ||
    envTenant;

  if (!resolvedTenant) {
    logger.warn("tenantScope: missing tenant identifier", {
      path: req.originalUrl,
      method: req.method,
    });
    res.status(400).json({ message: "Tenant ID is required" });
    return;
  }

  req.tenantId = resolvedTenant;
  res.setHeader("x-tenant-id", resolvedTenant);

  const headerSiteId = req.header("x-site-id");
  if (!req.siteId && headerSiteId) {
    req.siteId = headerSiteId;
  }

  next();
};

export default tenantScope;

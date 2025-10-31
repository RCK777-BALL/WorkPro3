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

  const headerSiteId = toStringOrUndefined(req.header("x-site-id"));
  const headerPlantId = toStringOrUndefined(req.header("x-plant-id"));
  const userPlantId = toStringOrUndefined(req.user?.plantId);
  const existingPlantId = toStringOrUndefined(req.plantId);

  const resolvedPlantId = existingPlantId || headerPlantId || headerSiteId || userPlantId;

  if (resolvedPlantId) {
    req.plantId = resolvedPlantId;
    if (!req.siteId) {
      req.siteId = resolvedPlantId;
    }
  } else if (headerSiteId && !req.siteId) {
    req.siteId = headerSiteId;
  }

  next();
};

export default tenantScope;

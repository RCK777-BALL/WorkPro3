/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from "express";
import logger from "../utils/logger";
import Site from "../models/Site";
import Tenant from "../models/Tenant";
import type { AuthedRequestHandler } from "../types/http";

const tenantSiteCache = new Map<string, string>();

const ensureTenantSite = async (tenantId: string): Promise<string> => {
  const cached = tenantSiteCache.get(tenantId);
  if (cached) {
    return cached;
  }

  const existing = await Site.findOne({ tenantId }).select("_id name").lean();
  if (existing?._id) {
    const resolved = existing._id.toString();
    tenantSiteCache.set(tenantId, resolved);
    return resolved;
  }

  const tenant = await Tenant.findById(tenantId).select("name").lean();
  const siteName = tenant?.name ? `${tenant.name} Site` : "Primary Site";
  const site = await Site.create({ tenantId, name: siteName });
  const resolved = site._id.toString();
  tenantSiteCache.set(tenantId, resolved);
  return resolved;
};

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

const tenantScope: AuthedRequestHandler = async (req, res: Response, next): Promise<void> => {
  const headerTenant = req.header("x-tenant-id");
  const userTenant = toStringOrUndefined(req.user?.tenantId);
  const resolvedTenantFromResolver = toStringOrUndefined((res.locals as { tenantId?: string }).tenantId);
  const existingTenant = toStringOrUndefined(req.tenantId);
  const envTenant = toStringOrUndefined(process.env.DEFAULT_TENANT_ID);

  const resolvedTenant =
    existingTenant ||
    resolvedTenantFromResolver ||
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

  const queryTenant = toStringOrUndefined((req.query as Record<string, unknown> & { tenantId?: unknown }).tenantId);
  if (queryTenant && queryTenant !== resolvedTenant) {
    res.status(403).json({ message: "Cross-tenant access denied" });
    return;
  }
  if (req.query && typeof req.query === "object") {
    (req.query as Record<string, unknown>).tenantId = resolvedTenant;
  }

  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    const bodyTenant = toStringOrUndefined((req.body as Record<string, unknown> & { tenantId?: unknown }).tenantId);
    if (bodyTenant && bodyTenant !== resolvedTenant) {
      res.status(403).json({ message: "Cross-tenant access denied" });
      return;
    }
    (req.body as Record<string, unknown>).tenantId = resolvedTenant;
  }

  const headerSiteId = toStringOrUndefined(req.header("x-site-id"));
  const headerPlantId = toStringOrUndefined(req.header("x-plant-id"));
  const userPlantId = toStringOrUndefined(req.user?.plantId);
  const userSiteId = toStringOrUndefined((req.user as { siteId?: unknown } | undefined)?.siteId);
  const existingPlantId = toStringOrUndefined(req.plantId);
  const existingSiteId = toStringOrUndefined(req.siteId);

  let resolvedPlantId = existingPlantId || headerPlantId || headerSiteId || userPlantId;
  let resolvedSiteId = existingSiteId || headerSiteId || userSiteId;

  if (!resolvedSiteId) {
    try {
      resolvedSiteId = await ensureTenantSite(resolvedTenant);
    } catch (error) {
      logger.error("tenantScope: unable to resolve site context", {
        tenantId: resolvedTenant,
        error,
      });
      res.status(500).json({ message: "Unable to resolve site context" });
      return;
    }
  }

  if (!resolvedPlantId && resolvedSiteId) {
    resolvedPlantId = resolvedSiteId;
  }

  if (resolvedPlantId) {
    req.plantId = resolvedPlantId;
  }

  if (resolvedSiteId) {
    req.siteId = resolvedSiteId;
  }

  next();
};

export default tenantScope;

/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

type MaybeString = string | undefined;

type RequestMeta = {
  requestId?: MaybeString;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  tenantId?: MaybeString;
  siteId?: MaybeString;
  userId?: MaybeString;
};

const resolveHeader = (value: string | string[] | undefined): MaybeString => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

const requestLog = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const meta: RequestMeta = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      tenantId: req.tenantId ?? resolveHeader(req.headers["x-tenant-id"]),
      siteId: req.siteId ?? resolveHeader(req.headers["x-site-id"]),
      userId: req.user && typeof req.user.id === "string" ? req.user.id : undefined,
    };

    logger.info("http_request", meta);
  });

  next();
};

export default requestLog;

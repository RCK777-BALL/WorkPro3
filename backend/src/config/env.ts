/*
 * SPDX-License-Identifier: MIT
 */

import logger from "../../utils/logger";

const WEAK_TOKENS = ["changeme", "change-me", "password"];

const normalizeValue = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const isWeakValue = (value: string | undefined): boolean => {
  const normalized = normalizeValue(value);
  if (!normalized) return true;
  const lower = normalized.toLowerCase();
  return WEAK_TOKENS.some((token) => lower.includes(token));
};

const parseOrigins = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const assertProductionEnv = (): void => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
    process.env.MONGO_URI = process.env.MONGODB_URI;
  }

  const errors: string[] = [];
  const jwtSecret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  const mongoUri = process.env.MONGO_URI;
  const corsOrigins = parseOrigins(process.env.CORS_ORIGIN);
  const frontendUrl = process.env.FRONTEND_URL;

  if (!jwtSecret || jwtSecret.trim().length < 32 || isWeakValue(jwtSecret)) {
    errors.push("JWT_SECRET or JWT_ACCESS_SECRET must be at least 32 characters and not a placeholder.");
  }

  if (!mongoUri || isWeakValue(mongoUri)) {
    errors.push("MONGO_URI (or MONGODB_URI) must be set and not a placeholder.");
  }

  if (corsOrigins.length === 0 || corsOrigins.some((origin) => isWeakValue(origin))) {
    errors.push("CORS_ORIGIN must include at least one non-placeholder origin.");
  }

  if (!frontendUrl || isWeakValue(frontendUrl)) {
    errors.push("FRONTEND_URL must be set and not a placeholder.");
  }

  if (errors.length > 0) {
    errors.forEach((message) => logger.error(message));
    process.exit(1);
  }
};

/*
 * SPDX-License-Identifier: MIT
 */

const normalizeEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const requireEnv = (key: "VITE_API_URL" | "VITE_WS_URL" | "VITE_SOCKET_PATH"): string => {
  const value = normalizeEnv(import.meta.env[key]);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Set it in your Vite environment configuration.`,
    );
  }
  return value;
};

export const API_URL = requireEnv("VITE_API_URL");
export const SOCKET_PATH = requireEnv("VITE_SOCKET_PATH");
export const SOCKET_URL = normalizeEnv(import.meta.env.VITE_SOCKET_URL) ?? requireEnv("VITE_WS_URL");

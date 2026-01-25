/*
 * SPDX-License-Identifier: MIT
 */

const normalizeEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const API_URL = normalizeEnv(import.meta.env.VITE_API_URL) ?? "http://localhost:5010";
export const SOCKET_PATH = normalizeEnv(import.meta.env.VITE_SOCKET_PATH) ?? "/socket.io";
export const SOCKET_URL = normalizeEnv(import.meta.env.VITE_SOCKET_URL) ?? API_URL;

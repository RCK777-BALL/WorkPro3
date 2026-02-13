/*
 * SPDX-License-Identifier: MIT
 */

type ViteEnv = Record<string, string | undefined>;
const getEnvVar = (key: string): string | undefined =>
  (import.meta.env as unknown as ViteEnv)?.[key];

export const config = {
  // Base server URL (without trailing /api)
  apiUrl: getEnvVar('VITE_API_URL') ?? 'http://localhost:5010',
  // Optional explicit origins/urls
  httpOrigin: getEnvVar('VITE_HTTP_ORIGIN'),
  socketUrl: getEnvVar('VITE_SOCKET_URL') ?? getEnvVar('VITE_WS_URL'),
  // Socket.IO path (backend default is '/socket.io')
  socketPath: getEnvVar('VITE_SOCKET_PATH') ?? '/socket.io',
} as const;

function stripApiSuffix(url: string) {
  try {
    const u = new URL(url);
    if (u.pathname.endsWith('/api')) u.pathname = u.pathname.replace(/\/api$/, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return url.replace(/\/api$/, '').replace(/\/$/, '');
  }
}

// Normalize origins (no trailing slash)
const httpOrigin = (config.httpOrigin ?? stripApiSuffix(config.apiUrl)).replace(/\/$/, '');
const socketOrigin = (config.socketUrl ?? httpOrigin)
  .replace(/^ws/i, 'http')
  .replace(/\/$/, '');

export const endpoints = {
  httpOrigin,
  socketOrigin,
  socketPath: config.socketPath, // <-- fix: reference from config
} as const;

export const apiBaseUrl = `${httpOrigin}/api`;

export default endpoints;

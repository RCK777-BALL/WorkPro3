import { API_URL } from '@/config/env';

type ViteEnv = Record<string, string | undefined>;
const getEnvVar = (key: string): string | undefined =>
  (import.meta.env as unknown as ViteEnv)?.[key];

const httpOrigin = (getEnvVar('VITE_HTTP_ORIGIN') ?? API_URL).replace(/\/$/, '');
const socketOrigin = (getEnvVar('VITE_WS_URL') ?? httpOrigin).replace(/^http/i, 'ws');
const socketPath = getEnvVar('VITE_SOCKET_PATH') ?? '/socket.io';

export const endpoints = {
  httpOrigin,
  socketOrigin,
  socketPath,
};

export const apiBaseUrl = `${httpOrigin}/api`;

export default endpoints;

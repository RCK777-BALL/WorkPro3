type Endpoints = {
  httpOrigin: string;
  socketOrigin: string;
  socketPath: string;
};

function getEnvVar(key: string): string | undefined {
  // Vite build/runtime
  // @ts-ignore
  const vite = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  return vite?.[key] ?? (typeof process !== 'undefined' ? (process.env as any)?.[key] : undefined);
}

const apiUrl = getEnvVar('VITE_API_URL') ?? 'http://localhost:5010/api';
const wsUrl = getEnvVar('VITE_WS_URL');
const wsPath =
  getEnvVar('VITE_WS_PATH') ??
  getEnvVar('VITE_SOCKET_PATH') ??
  '/ws/notifications';

function stripApiSuffix(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.endsWith('/api')) {
      u.pathname = u.pathname.replace(/\/api$/, '');
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    // Fallback for non-URL strings
    return url.replace(/\/api$/, '').replace(/\/$/, '');
  }
}

export const config = {
  apiUrl,
  wsUrl: wsUrl ?? null,
  wsPath,
};

export const endpoints: Endpoints = {
  httpOrigin: stripApiSuffix(apiUrl),
  socketOrigin: (wsUrl ?? stripApiSuffix(apiUrl)).replace(/^http/i, 'ws'),
  socketPath: wsPath,
};

export default endpoints;


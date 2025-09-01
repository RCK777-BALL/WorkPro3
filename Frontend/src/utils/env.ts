export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5010/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? null,
  wsPath: import.meta.env.VITE_WS_PATH ?? '/socket.io',
};

function stripApiSuffix(url: string) {
  try {
    const u = new URL(url);
    if (u.pathname.endsWith('/api')) u.pathname = u.pathname.replace(/\/api$/, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return url.replace(/\/api$/, '');
  }
}

export const endpoints = {
  httpOrigin: stripApiSuffix(config.apiUrl),
  socketOrigin: (config.wsUrl ?? stripApiSuffix(config.apiUrl)).replace(/^http/, 'ws'),
  socketPath: config.wsPath,
};

const required = ['VITE_API_URL'];
const optional = ['VITE_WS_URL', 'VITE_SOCKET_PATH'];
const defaults = {
  VITE_API_URL: 'http://localhost:5010/api',
  VITE_WS_URL: 'http://localhost:5010',
  VITE_SOCKET_PATH: '/socket.io',
};

for (const key of required) {
  if (!process.env[key] && defaults[key]) {
    process.env[key] = defaults[key];
    console.warn(`Required env var not set: ${key}. Using default "${defaults[key]}".`);
  }
}

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.CI) {
  console.error(`Missing required env vars in CI: ${missing.join(', ')}`);
  process.exit(1);
}

for (const key of optional) {
  if (!process.env[key]) {
    if (defaults[key]) {
      process.env[key] = defaults[key];
      console.warn(`Optional env var not set: ${key}. Using default "${defaults[key]}".`);
      continue;
    }
    console.warn(`Optional env var not set: ${key}`);
  }
}

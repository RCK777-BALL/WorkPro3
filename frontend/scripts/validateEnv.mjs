const required = ['VITE_API_URL'];
const optional = ['VITE_WS_URL', 'VITE_SOCKET_PATH'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

for (const key of optional) {
  if (!process.env[key]) {
    console.warn(`Optional env var not set: ${key}`);
  }
}

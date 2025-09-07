import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5010/api',
});

// Storage keys (keep in sync with Login flow)
const TOKEN_KEY = 'auth:token';
const TENANT_KEY = 'auth:tenantId';
const SITE_KEY = 'auth:siteId';

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem(TENANT_KEY);
  const siteId = localStorage.getItem(SITE_KEY);
  if (tenantId) (config.headers as any)['x-tenant-id'] = tenantId;
  if (siteId) (config.headers as any)['x-site-id'] = siteId;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // drop bad token and force re-login
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default http;


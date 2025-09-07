import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5010/api',
  withCredentials: true,
});

const TOKEN_KEY = 'auth:token';
const TENANT_KEY = 'auth:tenantId';
const SITE_KEY = 'auth:siteId';

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

http.interceptors.request.use((config) => {
  const token = getCookie(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  const tenantId = getCookie(TENANT_KEY);
  const siteId = getCookie(SITE_KEY);
  if (tenantId) (config.headers as any)['x-tenant-id'] = tenantId;
  if (siteId) (config.headers as any)['x-site-id'] = siteId;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default http;

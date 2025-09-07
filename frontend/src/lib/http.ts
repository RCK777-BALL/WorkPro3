import axios, { AxiosError } from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5010/api',
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth:token');
  const tenantId = localStorage.getItem('auth:tenantId');
  const siteId = localStorage.getItem('auth:siteId');

  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  if (siteId) {
    config.headers['x-site-id'] = siteId;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth:token');
      window.location.href = '/login';
    }
    throw err;
  },
);

export default http;

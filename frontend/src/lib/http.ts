import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5010').replace(/\/+$/, '');
const http = axios.create({
  baseURL: `${baseUrl}/api`,
  withCredentials: true,
});

const TOKEN_KEY = 'auth:token';
const TENANT_KEY = 'auth:tenantId';
const SITE_KEY = 'auth:siteId';


http.interceptors.request.use((config) => {
  const headers: AxiosRequestHeaders = config.headers ?? {};
  const token = localStorage.getItem(TOKEN_KEY);
 
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem(TENANT_KEY);
  const siteId = localStorage.getItem(SITE_KEY);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (siteId) headers['x-site-id'] = siteId;
  config.headers = headers;
 
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

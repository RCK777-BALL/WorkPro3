import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';
import { API_URL } from '@/config/env';

const http = axios.create({
  baseURL: `${API_URL}/api`,
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

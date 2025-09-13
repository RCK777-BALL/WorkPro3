/*
 * SPDX-License-Identifier: MIT
 */

import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5010').replace(/\/+$/, '');
const http = axios.create({
  baseURL: `${baseUrl}/api`,
  withCredentials: true,
});

export const TOKEN_KEY = 'auth:token';
export const TENANT_KEY = 'auth:tenantId';
export const SITE_KEY = 'auth:siteId';

type UnauthorizedCallback = () => void;
let unauthorizedCallback: UnauthorizedCallback | null = null;

export const setUnauthorizedCallback = (cb: UnauthorizedCallback) => {
  unauthorizedCallback = cb;
};


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
      unauthorizedCallback?.();
    }
    return Promise.reject(err);
  }
);

export default http;

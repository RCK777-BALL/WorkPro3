/*
 * SPDX-License-Identifier: MIT
 */

import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';
import type { ApiResult } from '../../shared/types/http';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5010').replace(/\/+$/, '');

export const TOKEN_KEY = 'auth:token';
export const TENANT_KEY = 'auth:tenantId';
export const SITE_KEY = 'auth:siteId';

let unauthorizedCallback: (() => void) | undefined;
export const setUnauthorizedCallback = (cb: () => void) => {
  unauthorizedCallback = cb;
};

const http = axios.create({
  baseURL: `${baseUrl}/api`,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const headers: AxiosRequestHeaders = config.headers ?? {};
  const tenantId = localStorage.getItem(TENANT_KEY);
  const siteId = localStorage.getItem(SITE_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (siteId) headers['x-site-id'] = siteId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  config.headers = headers;

  return config;
});

http.interceptors.response.use(
  (r) => {
    const { data, error } = (r.data as ApiResult<unknown>) ?? {};
    if (error) {
      return Promise.reject(error);
    }
    r.data = data;
    return r;
  },
  (err) => {
    if (err?.response?.status === 401) {
      unauthorizedCallback?.();
    }
    return Promise.reject(err);
  }
);

export default http;

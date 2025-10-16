/*
 * SPDX-License-Identifier: MIT
 */

import axios from 'axios';
import type {
  AxiosRequestHeaders,
  AxiosResponse,
  AxiosError,
} from 'axios';
import type { ApiResult } from '@shared/http';

const DEFAULT_API_BASE_URL = 'http://localhost:5010/api';

const resolveBaseUrl = (value?: string) => {
  const raw = (value ?? DEFAULT_API_BASE_URL).trim();
  if (!raw) return DEFAULT_API_BASE_URL;
  const normalized = raw.replace(/\/+$/, '');
  if (/\/api(?:\b|\/)/.test(normalized)) {
    return normalized;
  }
  return `${normalized}/api`;
};

const baseUrl = resolveBaseUrl(import.meta.env.VITE_API_URL);

export const TOKEN_KEY = 'auth:token';
export const TENANT_KEY = 'auth:tenantId';
export const SITE_KEY = 'auth:siteId';
export const FALLBACK_TOKEN_KEY = 'token';
export const USER_STORAGE_KEY = 'user';

let unauthorizedCallback: (() => void) | undefined;
export const setUnauthorizedCallback = (cb: () => void) => {
  unauthorizedCallback = cb;
};

const http = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (config.baseURL && typeof config.url === 'string' && config.url.startsWith('/')) {
    config.url = config.url.replace(/^\/+/, '');
  }

  const headers: AxiosRequestHeaders = config.headers ?? {};
  const tenantId = localStorage.getItem(TENANT_KEY);
  const siteId = localStorage.getItem(SITE_KEY);
  const token = localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(FALLBACK_TOKEN_KEY);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (siteId) headers['x-site-id'] = siteId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  config.headers = headers;

  return config;
});

http.interceptors.response.use(
  <T>(response: AxiosResponse<ApiResult<T> | T>): AxiosResponse<T> => {
    const payload = response.data as ApiResult<T> | T | undefined;

    if (!payload || typeof payload !== 'object') {
      return response as AxiosResponse<T>;
    }

    const hasDataKey = Object.prototype.hasOwnProperty.call(payload, 'data');
    const hasErrorKey = Object.prototype.hasOwnProperty.call(payload, 'error');

    if (!hasDataKey && !hasErrorKey) {
      return response as AxiosResponse<T>;
    }

    const { data, error } = payload as ApiResult<T>;
    if (error) {
      return Promise.reject(error);
    }

    const typedResponse = response as AxiosResponse<T>;
    typedResponse.data = data as T;
    return typedResponse;
  },
  (err: AxiosError) => {
    if (err?.response?.status === 401) {
      unauthorizedCallback?.();
    }
    return Promise.reject(err);
  }
);

export default http;

/*
 * SPDX-License-Identifier: MIT
 */

import axios, { AxiosHeaders } from 'axios';
import type {
  AxiosRequestHeaders,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { unwrapApiPayload, type ApiPayload } from '@/utils/apiPayload';
import { getAuthToken, getAuthTokenSync } from '@/utils/secureAuthStorage';

const DEFAULT_API_BASE_URL = 'http://localhost:5010/api';

const resolveBaseUrl = (value?: string) => {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const raw = (value ?? browserOrigin ?? DEFAULT_API_BASE_URL).trim();

  if (!raw) return DEFAULT_API_BASE_URL;

  const normalized = raw.replace(/\/+$/, '');

  if (/^\//.test(normalized)) {
    return normalized || '/api';
  }

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

export const triggerUnauthorized = () => {
  unauthorizedCallback?.();
};

const http = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

const hasHeader = (headers: AxiosRequestHeaders, name: string): boolean => {
  const normalized = name.toLowerCase();
  const headerBag = headers as { has?: (header: string) => boolean };
  if (typeof headerBag.has === 'function') {
    return Boolean(headerBag.has(name) || headerBag.has(normalized));
  }
  return Object.keys(headers).some((key) => key.toLowerCase() === normalized);
};

http.interceptors.request.use(async (config) => {
  if (config.baseURL && typeof config.url === 'string' && !/^https?:\/\//i.test(config.url)) {
    const baseHasTrailingSlash = config.baseURL.endsWith('/');
    const urlHasLeadingSlash = config.url.startsWith('/');

    if (baseHasTrailingSlash && urlHasLeadingSlash) {
      config.url = config.url.replace(/^\/+/, '');
    } else if (!baseHasTrailingSlash && !urlHasLeadingSlash) {
      config.url = `/${config.url}`;
    }
  }

  const headers: AxiosRequestHeaders = config.headers ?? new AxiosHeaders();
  const tenantId = safeLocalStorage.getItem(TENANT_KEY);
  const siteId = safeLocalStorage.getItem(SITE_KEY);
  const token =
    getAuthTokenSync() ??
    (await getAuthToken()) ??
    safeLocalStorage.getItem(TOKEN_KEY) ??
    safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (siteId && !hasHeader(headers, 'x-site-id')) {
    headers['x-site-id'] = siteId;
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  config.headers = headers;

  return config;
});

http.interceptors.response.use(
  <T>(response: AxiosResponse<ApiPayload<T>>): AxiosResponse<T> => {
    const typedResponse = response as AxiosResponse<T>;
    typedResponse.data = unwrapApiPayload(response.data);
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

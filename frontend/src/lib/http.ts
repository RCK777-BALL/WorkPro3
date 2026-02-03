/*
 * SPDX-License-Identifier: MIT
 */

import axios from 'axios';
import type {
  AxiosRequestHeaders,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { unwrapApiPayload, type ApiPayload } from '@/utils/apiPayload';
import { API_URL } from '@/config/env';

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

const baseUrl = resolveBaseUrl(API_URL);

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

const refreshClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

const attemptRefresh = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshClient
    .post('/auth/refresh')
    .then((res) => {
      const token =
        (res.data as { data?: { token?: string } })?.data?.token ??
        (res.data as { token?: string })?.token ??
        null;
      if (token) {
        safeLocalStorage.setItem(TOKEN_KEY, token);
        safeLocalStorage.setItem(FALLBACK_TOKEN_KEY, token);
      }
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

const hasHeader = (headers: AxiosRequestHeaders, name: string): boolean => {
  const normalized = name.toLowerCase();
  const headerBag = headers as { has?: (header: string) => boolean };
  if (typeof headerBag.has === 'function') {
    return Boolean(headerBag.has(name) || headerBag.has(normalized));
  }
  return Object.keys(headers).some((key) => key.toLowerCase() === normalized);
};

http.interceptors.request.use((config) => {
  if (config.baseURL && typeof config.url === 'string' && !/^https?:\/\//i.test(config.url)) {
    const baseHasTrailingSlash = config.baseURL.endsWith('/');
    const urlHasLeadingSlash = config.url.startsWith('/');

    if (baseHasTrailingSlash && urlHasLeadingSlash) {
      config.url = config.url.replace(/^\/+/, '');
    } else if (!baseHasTrailingSlash && !urlHasLeadingSlash) {
      config.url = `/${config.url}`;
    }
  }

  const headers: AxiosRequestHeaders = config.headers ?? {};
  const tenantId = safeLocalStorage.getItem(TENANT_KEY);
  const siteId = safeLocalStorage.getItem(SITE_KEY);
  const token =
    safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY);
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
  async (err: AxiosError) => {
    const status = err?.response?.status;
    const originalRequest = err.config as (typeof err.config & { _retry?: boolean }) | undefined;
    const requestUrl = typeof originalRequest?.url === 'string' ? originalRequest.url : '';
    const isAuthCall = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh');

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      const token = await attemptRefresh();
      if (token) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${token}`,
        };
        return http(originalRequest);
      }
      unauthorizedCallback?.();
    }

    if (status === 401 && isAuthCall) {
      unauthorizedCallback?.();
    }
    return Promise.reject(err);
  }
);

export default http;

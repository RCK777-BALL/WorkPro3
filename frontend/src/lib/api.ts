import axios, { AxiosHeaders } from "axios";
import type { AxiosResponse } from "axios";

import {
  FALLBACK_TOKEN_KEY,
  SITE_KEY,
  TENANT_KEY,
  TOKEN_KEY,
  USER_STORAGE_KEY,
  triggerUnauthorized,
} from "./http";
import { safeLocalStorage } from "@/utils/safeLocalStorage";
import { unwrapApiPayload, type ApiPayload } from "@/utils/apiPayload";
import { API_URL } from "@/config/env";

const DEFAULT_API_BASE_URL = "http://localhost:5010/api";

const resolveBaseUrl = (value?: string) => {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const raw = (value ?? browserOrigin ?? DEFAULT_API_BASE_URL).trim();

  if (!raw) return DEFAULT_API_BASE_URL;

  const normalized = raw.replace(/\/+$/, "");

  if (/^\//.test(normalized)) {
    return normalized || "/api";
  }

  if (/\/api(?:\b|\/)/.test(normalized)) {
    return normalized;
  }

  return `${normalized}/api`;
};

const baseURL = resolveBaseUrl(API_URL);

const clearAuthStorage = () => {
  [TOKEN_KEY, TENANT_KEY, SITE_KEY, FALLBACK_TOKEN_KEY, USER_STORAGE_KEY].forEach((key) => {
    if (key) {
      safeLocalStorage.removeItem(key);
    }
  });
};

const resolveToken = () =>
  safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY) ?? undefined;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

const attemptRefresh = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshClient
    .post("/auth/refresh")
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

api.interceptors.request.use((config) => {
  if (config.baseURL && typeof config.url === "string" && !/^https?:\/\//i.test(config.url)) {
    const baseHasTrailingSlash = config.baseURL.endsWith("/");
    const urlHasLeadingSlash = config.url.startsWith("/");

    if (baseHasTrailingSlash && urlHasLeadingSlash) {
      config.url = config.url.replace(/^\/+/, "");
    } else if (!baseHasTrailingSlash && !urlHasLeadingSlash) {
      config.url = `/${config.url}`;
    }
  }

  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);

  const tenantId = safeLocalStorage.getItem(TENANT_KEY);
  const siteId = safeLocalStorage.getItem(SITE_KEY);
  const token = resolveToken();

  if (tenantId) {
    headers.set("x-tenant-id", tenantId);
  }

  if (siteId) {
    headers.set("x-site-id", siteId);
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  <T>(response: AxiosResponse<ApiPayload<T>>): AxiosResponse<T> => {
    const typedResponse = response as AxiosResponse<T>;
    typedResponse.data = unwrapApiPayload(response.data);
    return typedResponse;
  },
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const requestUrl = typeof originalRequest?.url === "string" ? originalRequest.url : "";
    const isAuthCall = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      const token = await attemptRefresh();
      if (token) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${token}`,
        };
        return api(originalRequest);
      }
      clearAuthStorage();
      triggerUnauthorized();
      return Promise.reject(error);
    }

    if (status === 401) {
      clearAuthStorage();
      triggerUnauthorized();
    }
    return Promise.reject(error);
  }
);

export type ApiError = { error?: { code: number; message: string; details?: unknown } };

export function getErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiError)?.error?.message ?? err.message;
  }
  return 'Unexpected error';
}

export type PageQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
};

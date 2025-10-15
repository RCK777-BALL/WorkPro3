import axios, { AxiosHeaders } from "axios";

const DEFAULT_API_BASE_URL = "http://localhost:5010/api";

const resolveBaseUrl = (value?: string) => {
  const raw = (value ?? DEFAULT_API_BASE_URL).trim();
  if (!raw) return DEFAULT_API_BASE_URL;

  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(withoutTrailingSlash);
  const withLeadingSlash = hasProtocol
    ? withoutTrailingSlash
    : withoutTrailingSlash.startsWith("/")
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`;

  const ensuredApi = /\/api(?:\b|\/)/.test(withLeadingSlash)
    ? withLeadingSlash
    : `${withLeadingSlash}/api`;

  if (hasProtocol) {
    return ensuredApi;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${ensuredApi}`;
  }

  return ensuredApi.startsWith("/") ? ensuredApi : `/${ensuredApi}`;
};

const baseURL = resolveBaseUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (config.baseURL && typeof config.url === "string" && config.url.startsWith("/")) {
    config.url = config.url.replace(/^\/+/, "");
  }

  const tenantId = localStorage.getItem("tenantId") || "default";
  const headers =
    config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers);
  headers.set("x-tenant-id", tenantId);
  config.headers = headers;
  return config;
});

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

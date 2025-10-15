import axios, { AxiosHeaders } from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5010/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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

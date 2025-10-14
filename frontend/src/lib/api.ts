import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5010/api',
  withCredentials: true,
  headers: { 'X-Tenant-Id': 'demo' },
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

import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send cookies
});

export type ApiError = { error?: { code: number; message: string; details?: unknown } };

export function getErrorMessage(err: unknown) {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiError)?.error?.message ?? err.message;
  }
  return 'Unexpected error';
}

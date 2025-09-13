/*
 * SPDX-License-Identifier: MIT
 */

import { API_URL } from '@/config/env';
import axios from 'axios';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// Unwrap the `{ data, error }` envelope used by the backend.
api.interceptors.response.use(
  (response) => {
    const { data, error } = response.data ?? {};
    if (error) {
      return Promise.reject(error);
    }
    return data;
  },
  (error) => {
    const payload = error.response?.data;
    return Promise.reject(payload?.error ?? error);
  },
);

export default api;

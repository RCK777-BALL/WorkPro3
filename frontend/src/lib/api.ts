/*
 * SPDX-License-Identifier: MIT
 */

import type { ApiResult } from '@shared/http';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5010').replace(/\/+$/, '');

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });

  const json: ApiResult<T> = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json;
}

export default { fetchJson };

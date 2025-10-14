/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';
import type { Method } from 'axios';

import http, { TENANT_KEY } from '@/lib/http';

export function useApi<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (url: string, method: Method = 'GET', body?: unknown) => {
      setLoading(true);
      setError(null);
      try {
        const tenantId =
          typeof window !== 'undefined' ? localStorage.getItem(TENANT_KEY) : null;
        const response = await http.request<T>({
          url,
          method,
          data: body,
          headers: {
            'X-Tenant-Id': tenantId ?? 'demo',
          },
        });
        return response.data;
      } catch (err: unknown) {
        const fallback = err instanceof Error ? err.message : 'Network Error';
        const apiMessage =
          typeof (err as any)?.response?.data?.error === 'string'
            ? (err as any).response.data.error
            : fallback;
        setError(apiMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { request, loading, error };
}

export default useApi;

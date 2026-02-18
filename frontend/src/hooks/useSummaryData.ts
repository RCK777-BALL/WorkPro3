/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import http from '@/lib/http';

type CacheEntry<T> = { promise?: Promise<T | undefined>; data?: T; ts?: number };
const cache: Record<string, CacheEntry<unknown>> = {};

export function useSummary<T = unknown>(
  path: string,
  deps: unknown[] = [],
  options: { auto?: boolean; poll?: boolean; ttlMs?: number } = {},
): [T | undefined, () => Promise<T | undefined>] {
  const { auto = true, poll = true, ttlMs = 10_000 } = options;
  const [, setTick] = useState(0);
  const mountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const backoffRef = useRef(1000); // start 1s

    const fetcher = useCallback(async (): Promise<T | undefined> => {
      const now = Date.now();
      const c = (cache[path] as CacheEntry<T>) || (cache[path] = {} as CacheEntry<T>);
      if (c.data && c.ts && now - c.ts < ttlMs) return c.data;
      if (c.promise) return c.promise;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

      const p = http
        .get<{ data?: T } | T>(path, { signal: controller.signal })
        .then((res) => {
          const response = res.data as { data?: T } | T;
          const payload = (response as { data?: T }).data ?? (response as T);
          if (!mountedRef.current) return payload;
          c.data = payload;
          c.ts = Date.now();
          delete c.promise;
          backoffRef.current = 1000;
          setTick((t) => t + 1);
          return c.data;
        })
        .catch(async (err: AxiosError | unknown) => {
          delete c.promise;
          if (err instanceof AxiosError && err.response?.status === 429) {
            await new Promise((r) => setTimeout(r, backoffRef.current));
            backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
          }
          console.error('fetch error', path, err);
          return undefined;
        });

    c.promise = p;
    return p;
  }, [path, ttlMs]);

  useEffect(() => {
    mountedRef.current = true;
    if (auto) fetcher();

    let timer: ReturnType<typeof setInterval> | undefined;
    if (poll && typeof window !== 'undefined') {
      timer = setInterval(() => fetcher(), 60_000);
    }

    return () => {
      mountedRef.current = false;
      if (timer) clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetcher, auto, poll, ...deps]);

  return [cache[path]?.data as T | undefined, fetcher];
}

export default useSummary;


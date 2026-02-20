/*
 * SPDX-License-Identifier: MIT
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (typeof window === "undefined") return false;
        if (error instanceof Error && /not found/i.test(error.message)) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

export type AppQueryClient = typeof queryClient;

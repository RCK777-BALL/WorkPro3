/*
 * SPDX-License-Identifier: MIT
 */

import type { ApiResult } from '@/types';

export type ApiPayload<T> = ApiResult<T> | T;

export const unwrapApiPayload = <T>(payload: ApiPayload<T>): T => {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  const hasDataKey = Object.prototype.hasOwnProperty.call(payload, 'data');
  const hasErrorKey = Object.prototype.hasOwnProperty.call(payload, 'error');

  if (!hasDataKey && !hasErrorKey) {
    return payload as T;
  }

  const { data, error } = payload as ApiResult<T>;
  if (error) {
    throw new Error(error);
  }

  return data as T;
};

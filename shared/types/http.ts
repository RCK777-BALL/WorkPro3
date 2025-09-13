/*
 * SPDX-License-Identifier: MIT
 */

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError<E = string> {
  data: null;
  error: E;
}

export type ApiResult<T, E = string> = ApiSuccess<T> | ApiError<E>;

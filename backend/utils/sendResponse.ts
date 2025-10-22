/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
  errors?: unknown;
}

const isErrorStatus = (status: number): boolean => status >= 400;

const toMessage = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export function buildResponse<T>(
  data: T | null,
  status: number,
  message?: string,
  errors?: unknown,
): ApiResponse<T> {
  const success = !isErrorStatus(status) && errors == null;
  const payload: ApiResponse<T> = {
    success,
    data,
  };

  const normalizedMessage = toMessage(message);
  if (normalizedMessage) {
    payload.message = normalizedMessage;
  }

  if (errors != null) {
    payload.errors = errors;
    if (!payload.message && typeof errors === 'string') {
      payload.message = errors;
    }
  }

  return payload;
}

export function sendResponse<T>(
  res: Response,
  data: T | null = null,
  errors?: unknown,
  status = 200,
  message?: string,
): void {
  let resolvedErrors = errors;
  let resolvedMessage = message;

  if (!resolvedMessage && typeof resolvedErrors === 'string') {
    resolvedMessage = resolvedErrors;
    resolvedErrors = undefined;
  }

  const payload = buildResponse(data, status, resolvedMessage, resolvedErrors);
  res.status(status).json(payload);
}

export default sendResponse;

/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

type ErrorPayload = string | Record<string, unknown> | unknown[] | null | undefined;

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message?: string;
  error?: ErrorPayload;
};

function resolveMessage(error: ErrorPayload, message?: string): string | undefined {
  if (message) {
    return message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  if (Array.isArray(error) && error.length > 0) {
    return 'Validation failed';
  }
  return undefined;
}

export function sendResponse<T>(
  res: Response,
  data: T | null,
  error: ErrorPayload = null,
  status = 200,
  message?: string,
): void {
  const success = error == null;
  const payload: ApiResponse<T> = {
    success,
    data,
  };

  const resolvedMessage = resolveMessage(error, message);
  if (resolvedMessage) {
    payload.message = resolvedMessage;
  }

  if (!success) {
    payload.error = error;
  }

  res.status(status).json(payload);
}

export default sendResponse;

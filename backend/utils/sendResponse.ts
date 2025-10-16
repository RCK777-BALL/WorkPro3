/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

const SUCCESS_MESSAGE_BY_STATUS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
};

/**
 * Helper to send a consistent JSON envelope from controllers.
 *
 * Responses now always follow the shape `{ success, data, message, error }`
 * so the frontend can reliably inspect the payload regardless of the HTTP
 * status code. The `error` field mirrors the previously exposed structure to
 * remain backwards compatible with existing consumers while the new
 * `success` and `message` properties add higher-level context.
 */
export const sendResponse = <T>(
  res: Response,
  data: T | null,
  errorOrMessage: unknown = null,
  status = 200,
  messageOverride?: string,
): Response => {
  const isErrorStatus = status >= 400;
  let message =
    messageOverride ??
    SUCCESS_MESSAGE_BY_STATUS[status] ??
    (isErrorStatus ? 'Request failed' : 'OK');

  let errorPayload: unknown = null;

  if (errorOrMessage !== null && errorOrMessage !== undefined) {
    if (typeof errorOrMessage === 'string' && messageOverride === undefined) {
      message = errorOrMessage;
      if (isErrorStatus) {
        errorPayload = errorOrMessage;
      }
    } else {
      errorPayload = errorOrMessage;
    }
  }

  const success = !isErrorStatus && errorPayload == null;

  return res.status(status).json({
    success,
    data,
    message,
    error: errorPayload,
  });
};

export default sendResponse;


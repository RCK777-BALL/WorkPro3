/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

/**
 * Helper to send a consistent JSON envelope from controllers.
 *
 * The response is always in the form `{ data, error }` and uses the provided
 * HTTP status code. This keeps the API shape uniform across successful and
 * error responses.
 *
 * @param res    Express response object
 * @param data   Payload to return on success, or `null` on error
 * @param error  Error information when the request fails
 * @param status HTTP status code (defaults to `200`)
 */
export const sendResponse = <T>(
  res: Response,
  data: T | null,
  error: unknown = null,
  status = 200,
): Response => {
  return res.status(status).json({ data, error });
};

export default sendResponse;


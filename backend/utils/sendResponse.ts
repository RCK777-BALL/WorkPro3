/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

export const sendResponse = <T>(
  res: Response,
  data: T | null,
  error: unknown = null,
  status = 200,
): Response => {
  return res.status(status).json({ data, error });
};


/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

export const fail = (res: Response, message: string, status = 500): void => {
  res.status(status).json({ success: false, error: message });
};

export default { fail };

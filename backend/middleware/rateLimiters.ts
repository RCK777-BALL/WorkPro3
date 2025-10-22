/*
 * SPDX-License-Identifier: MIT
 */

import rateLimit from 'express-rate-limit';

const DEFAULT_WINDOW_MS = 60_000;

export const authLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  authLimiter,
};

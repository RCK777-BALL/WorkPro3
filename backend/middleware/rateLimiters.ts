/*
 * SPDX-License-Identifier: MIT
 */

import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { register, login, me, refresh, logout } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/authValidators';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimiters';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { messagingService } from '../services/messaging';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', messaging: messagingService.getHealth() });
});

export default router;

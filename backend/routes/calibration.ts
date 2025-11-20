/*
 * SPDX-License-Identifier: MIT
 */

import express, { type NextFunction, type Request, type Response } from 'express';

const router = express.Router();

const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({ message: 'Calibration endpoints are not yet implemented.' });
};

router.get('/schedules', notImplemented);
router.get('/certificates', notImplemented);
router.post('/certificates', notImplemented);
router.get('/status', notImplemented);
router.post('/status/check', notImplemented);
router.post('/alerts', notImplemented);

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: err.message });
});

export default router;

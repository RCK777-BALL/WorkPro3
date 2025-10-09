/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import crypto from 'crypto';
import WorkRequest from '../models/WorkRequest';
import logger from '../utils/logger';

const router = Router();

router.post('/request-work', async (req, res) => {
  const { tenantId, assetId, locationText, description, contact } = req.body;
  const code = parseInt(crypto.randomBytes(4).toString('hex'), 16)
    .toString(36)
    .toUpperCase();

  try {
    await WorkRequest.create({
      tenantId,
      assetId,
      locationText,
      description,
      contact,
      code,
      status: 'new',
    });

    logger.info('Work request submitted', { code });
    console.log('Work request submitted', code);
    res.status(201).json({ code });
  } catch (err) {
    logger.error('Work request submission failed', err);
    res.status(500).json({ error: 'Failed to submit work request' });
  }
});

router.get('/request-work/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const request = await WorkRequest.findOne({ code });
    if (!request) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ status: request.status });
  } catch (err) {
    logger.error('Work request retrieval failed', err);
    res.status(500).json({ error: 'Failed to fetch work request' });
  }
});

export default router;

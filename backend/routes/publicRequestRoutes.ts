/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import WorkRequest from '../models/WorkRequest';

const router = Router();

router.post('/request-work', async (req, res) => {
  const { tenantId, assetId, locationText, description, contact } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  await WorkRequest.create({
    tenantId,
    assetId,
    locationText,
    description,
    contact,
    code,
    status: 'new',
  });

  console.log(`Work request submitted: ${code}`);

  res.status(201).json({ code });
});

router.get('/request-work/:code', async (req, res) => {
  const { code } = req.params;
  const request = await WorkRequest.findOne({ code });
  if (!request) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json({ status: request.status });
});

export default router;

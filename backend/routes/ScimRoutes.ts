/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { isFeatureEnabled } from '../utils/featureFlags';
import sendResponse from '../utils/sendResponse';

const router = Router();

const scimUserSchema = z.object({
  userName: z.string().min(1, 'userName is required'),
  name: z
    .object({ givenName: z.string().optional(), familyName: z.string().optional() })
    .optional(),
  active: z.boolean().optional(),
});

const scimGroupSchema = z.object({
  displayName: z.string().min(1, 'displayName is required'),
});

const requireScimAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!isFeatureEnabled('scim')) {
    res.status(404).json({ message: 'SCIM provisioning is disabled' });
    return;
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || token !== process.env.SCIM_BEARER_TOKEN) {
    res.status(401).json({ message: 'Invalid SCIM token' });
    return;
  }

  next();
};

router.use(requireScimAuth);

router.get('/v2/Users', (_req, res) => {
  res.json({ Resources: [], totalResults: 0, itemsPerPage: 0, startIndex: 1 });
});

router.post('/v2/Users', (req, res) => {
  const parsed = scimUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid SCIM user payload', errors: parsed.error.flatten() });
    return;
  }

  sendResponse(
    res,
    {
      id: 'pending-sync',
      userName: parsed.data.userName,
      active: parsed.data.active ?? true,
    },
    null,
    202,
    'User received',
  );
});

router.get('/v2/Groups', (_req, res) => {
  res.json({ Resources: [], totalResults: 0, itemsPerPage: 0, startIndex: 1 });
});

router.post('/v2/Groups', (req, res) => {
  const parsed = scimGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid SCIM group payload', errors: parsed.error.flatten() });
    return;
  }

  sendResponse(
    res,
    { id: 'pending-group', displayName: parsed.data.displayName },
    null,
    202,
    'Group received',
  );
});

export default router;

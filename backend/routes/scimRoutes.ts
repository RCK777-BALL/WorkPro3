/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import scimAuth from '../middleware/scimAuth';

const router = Router();

const scimUserSchema = z.object({
  userName: z.string().min(1, 'userName is required'),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  emails: z
    .array(
      z.object({
        value: z.string().email(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
  active: z.boolean().optional(),
});

const scimGroupSchema = z.object({
  displayName: z.string().min(1, 'displayName is required'),
  members: z
    .array(
      z.object({
        value: z.string(),
        type: z.enum(['User', 'Group']).optional(),
      }),
    )
    .optional(),
});

router.use(scimAuth);

router.get('/Users', (req: Request, res: Response) => {
  res.json({ Resources: [], totalResults: 0, itemsPerPage: 0, startIndex: 1 });
});

router.post('/Users', (req: Request, res: Response) => {
  const parsed = scimUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid SCIM user payload' });
    return;
  }

  res.status(201).json({
    ...parsed.data,
    id: `${Date.now()}`,
    meta: {
      resourceType: 'User',
      tenantId: (req as Request & { tenantId?: string }).tenantId,
    },
  });
});

router.get('/Groups', (req: Request, res: Response) => {
  res.json({ Resources: [], totalResults: 0, itemsPerPage: 0, startIndex: 1 });
});

router.post('/Groups', (req: Request, res: Response) => {
  const parsed = scimGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid SCIM group payload' });
    return;
  }

  res.status(201).json({
    ...parsed.data,
    id: `${Date.now()}`,
    meta: {
      resourceType: 'Group',
      tenantId: (req as Request & { tenantId?: string }).tenantId,
    },
  });
});

export default router;

/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request } from 'express';
import { randomUUID } from 'crypto';
import scimAuth from '../middleware/scimAuth';

type TenantRequest = Request & { tenantId?: string };

const router = Router();

router.use(scimAuth);

const buildListResponse = () => ({
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  totalResults: 0,
  startIndex: 1,
  itemsPerPage: 0,
  Resources: [],
});

const buildMeta = (resourceType: 'User' | 'Group', tenantId: string | undefined, id: string) => {
  const timestamp = new Date().toISOString();
  return {
    resourceType,
    tenantId,
    location: `/api/scim/v2/${resourceType === 'User' ? 'Users' : 'Groups'}/${id}`,
    created: timestamp,
    lastModified: timestamp,
  };
};

router.get('/Users', (_req, res) => {
  res.json(buildListResponse());
});

router.get('/Groups', (_req, res) => {
  res.json(buildListResponse());
});

router.post('/Users', (req, res) => {
  const tenantId = (req as TenantRequest).tenantId;
  const id = req.body?.id ?? randomUUID();
  const meta = buildMeta('User', tenantId, id);

  res.status(201).json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id,
    ...req.body,
    meta,
  });
});

router.post('/Groups', (req, res) => {
  const tenantId = (req as TenantRequest).tenantId;
  const id = req.body?.id ?? randomUUID();
  const meta = buildMeta('Group', tenantId, id);

  res.status(201).json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id,
    ...req.body,
    meta,
  });
});

export default router;

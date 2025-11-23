/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request, type Response, type NextFunction } from 'express';

import { isFeatureEnabled } from '../config/featureFlags';
import sendResponse from '../utils/sendResponse';

const router = Router();

const requireScimEnabled = (_req: Request, res: Response, next: NextFunction): void => {
  if (!isFeatureEnabled('scim')) {
    sendResponse(res, null, 'SCIM is disabled', 404);
    return;
  }
  next();
};

const requireScimBearer = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.SCIM_BEARER_TOKEN;
  if (!expected) {
    sendResponse(res, null, 'SCIM token not configured', 503);
    return;
  }
  const provided = req.headers.authorization;
  if (!provided || !provided.startsWith('Bearer ')) {
    sendResponse(res, null, 'Missing SCIM bearer token', 401);
    return;
  }
  const token = provided.slice('Bearer '.length);
  if (token !== expected) {
    sendResponse(res, null, 'Invalid SCIM bearer token', 401);
    return;
  }
  next();
};

router.use(requireScimEnabled);
router.use(requireScimBearer);

router.get('/Users', (req: Request, res: Response) => {
  sendResponse(res, {
    Resources: [],
    totalResults: 0,
    itemsPerPage: 0,
    startIndex: 1,
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  });
});

router.post('/Users', (req: Request, res: Response) => {
  const userName = typeof req.body?.userName === 'string' ? req.body.userName : 'pending';
  sendResponse(
    res,
    {
      id: 'provisioning-pending',
      userName,
      active: false,
    },
    null,
    202,
    'SCIM user provisioning is stubbed',
  );
});

router.get('/Groups', (req: Request, res: Response) => {
  sendResponse(res, {
    Resources: [],
    totalResults: 0,
    itemsPerPage: 0,
    startIndex: 1,
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  });
});

router.post('/Groups', (req: Request, res: Response) => {
  const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName : 'pending';
  sendResponse(
    res,
    {
      id: 'group-pending',
      displayName,
      members: Array.isArray(req.body?.members) ? req.body?.members : [],
    },
    null,
    202,
    'SCIM group provisioning is stubbed',
  );
});

export default router;

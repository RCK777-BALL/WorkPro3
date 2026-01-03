/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import {
  createDefinition,
  createInstance,
  createSlaPolicy,
  listDefinitions,
  listInstances,
  listSlaPolicies,
} from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return false;
  }
  return true;
};

const buildContext = (req: AuthedRequest) => ({ tenantId: req.tenantId!, siteId: req.siteId ?? undefined });

export const listDefinitionsHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listDefinitions(buildContext(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createDefinitionHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as { name?: string; description?: string; steps?: Array<{ name?: string; type?: string }> };
  if (!body.name || typeof body.name !== 'string') {
    fail(res, 'name is required', 400);
    return;
  }
  try {
    const data = await createDefinition(buildContext(req), {
      name: body.name,
      description: body.description,
      steps: Array.isArray(body.steps)
        ? body.steps
            .filter((step) => typeof step?.name === 'string' && typeof step?.type === 'string')
            .map((step) => ({ name: step.name as string, type: step.type as string }))
        : [],
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listInstancesHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listInstances(buildContext(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createInstanceHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as { definitionId?: string; context?: Record<string, unknown> };
  if (!body.definitionId || typeof body.definitionId !== 'string') {
    fail(res, 'definitionId is required', 400);
    return;
  }
  try {
    const data = await createInstance(buildContext(req), {
      definitionId: body.definitionId,
      context: body.context,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listSlaPoliciesHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await listSlaPolicies(buildContext(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createSlaPolicyHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const body = req.body as { name?: string; resolveMinutes?: number; responseMinutes?: number };
  if (!body.name || typeof body.name !== 'string') {
    fail(res, 'name is required', 400);
    return;
  }
  if (typeof body.resolveMinutes !== 'number') {
    fail(res, 'resolveMinutes is required', 400);
    return;
  }
  try {
    const data = await createSlaPolicy(buildContext(req), {
      name: body.name,
      resolveMinutes: body.resolveMinutes,
      responseMinutes: typeof body.responseMinutes === 'number' ? body.responseMinutes : undefined,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

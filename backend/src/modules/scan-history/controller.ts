/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { buildSessionBinding } from '../../../utils/sessionBinding';
import { recordScanHistory, type ScanHistoryInput, type ScanHistoryContext } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

const send = (res: Response, data: unknown, status = 200) => {
  res.status(status).json({ success: true, data });
};

const resolveContext = (req: AuthedRequest): ScanHistoryContext => {
  const actor = req.user && typeof req.user === 'object'
    ? {
        id: (req.user as { id?: string; _id?: string }).id ?? (req.user as { _id?: string })._id,
        name: (req.user as { name?: string }).name,
        email: (req.user as { email?: string }).email,
      }
    : undefined;
  const userId = (req.user as { id?: string; _id?: string } | undefined)?.id ?? (req.user as { _id?: string } | undefined)?._id;

  return {
    tenantId: req.tenantId!,
    siteId: req.siteId,
    userId,
    actor,
    session: buildSessionBinding(req),
  };
};

const sanitizeInput = (body: unknown): ScanHistoryInput | null => {
  if (!body || typeof body !== 'object') return null;
  const payload = body as Record<string, unknown>;
  const rawValue = typeof payload.rawValue === 'string' ? payload.rawValue.trim() : '';
  const outcome = payload.outcome === 'success' ? 'success' : payload.outcome === 'failure' ? 'failure' : null;
  if (!rawValue || !outcome) return null;

  const resolution = payload.resolution && typeof payload.resolution === 'object'
    ? {
        type: typeof (payload.resolution as Record<string, unknown>).type === 'string'
          ? String((payload.resolution as Record<string, unknown>).type)
          : undefined,
        id: typeof (payload.resolution as Record<string, unknown>).id === 'string'
          ? String((payload.resolution as Record<string, unknown>).id)
          : undefined,
        label: typeof (payload.resolution as Record<string, unknown>).label === 'string'
          ? String((payload.resolution as Record<string, unknown>).label)
          : undefined,
        path: typeof (payload.resolution as Record<string, unknown>).path === 'string'
          ? String((payload.resolution as Record<string, unknown>).path)
          : undefined,
      }
    : undefined;

  return {
    rawValue,
    outcome,
    source: typeof payload.source === 'string' ? payload.source.trim() : undefined,
    error: typeof payload.error === 'string' ? payload.error.trim() : undefined,
    resolution,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? (payload.metadata as Record<string, unknown>) : undefined,
  };
};

export const createScanHistoryHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  const input = sanitizeInput(req.body);
  if (!input) {
    fail(res, 'Scan history payload is invalid', 400);
    return;
  }

  try {
    const entry = await recordScanHistory(resolveContext(req), input);
    send(res, entry, 201);
  } catch (err) {
    next(err);
  }
};

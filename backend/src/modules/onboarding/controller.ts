/*
 * SPDX-License-Identifier: MIT
 */

import type { Response } from 'express';

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { fail } from '../../lib/http';
import { dismissOnboardingReminder, getOnboardingState } from './service';

const ensureTenant = (req: AuthedRequest, res: Response): req is AuthedRequest & { tenantId: string } => {
  if (!req.tenantId) {
    fail(res, 'Tenant context is required', 400);
    return false;
  }
  return true;
};

export const getOnboardingStateHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await getOnboardingState(req.tenantId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const dismissOnboardingReminderHandler: AuthedRequestHandler = async (req, res, next) => {
  if (!ensureTenant(req, res)) return;
  try {
    const data = await dismissOnboardingReminder(req.tenantId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

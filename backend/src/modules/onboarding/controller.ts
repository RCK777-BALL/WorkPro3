/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequest, AuthedRequestHandler } from '../../../types/http';
import { dismissOnboardingReminder, getOnboardingState } from './service';

export const getOnboardingStateHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await getOnboardingState(req.tenantId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const dismissOnboardingReminderHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await dismissOnboardingReminder(req.tenantId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

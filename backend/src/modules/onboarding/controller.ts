/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../../../types/http';
import { dismissOnboardingReminder, getOnboardingState, restartOnboardingState } from './service';

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

export const restartOnboardingStateHandler: AuthedRequestHandler = async (req, res, next) => {
  try {
    const data = await restartOnboardingState(req.tenantId!);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

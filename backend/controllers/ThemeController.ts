/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';

export const getTheme: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { user } = req;

    const { theme = 'system', colorScheme = 'default' } = (user ?? {}) as {
      theme?: 'light' | 'dark' | 'system';
      colorScheme?: string;
    };

    res.json({ theme, colorScheme });
    return;
  } catch (err) {
    return next(err);
  }
};

export const updateTheme: AuthedRequestHandler = async (req, res, next) => {
  try {
    const { theme, colorScheme } = req.body;
    const { user } = req;

    const updated = await User.findByIdAndUpdate(
      user!._id,
      { theme, colorScheme },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    const userId = (req.user as any)?._id || (req.user as any)?.id;
    await writeAuditLog({
      tenantId: req.tenantId,
      userId,
      action: 'update',
      entityType: 'UserTheme',
      entityId: user!._id,
      before: null,
      after: { theme: updated.theme, colorScheme: updated.colorScheme },
    });
    res.json({ theme: updated.theme, colorScheme: updated.colorScheme });
    return;
  } catch (err) {
    return next(err);
  }
};

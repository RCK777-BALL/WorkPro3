/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { writeAuditLog } from '../utils/audit';

export const getTheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

export const updateTheme = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { theme, colorScheme } = req.body;
    const { user } = req;
    const tenantId = req.tenantId;
    if (!tenantId)
      return res.status(400).json({ message: 'Tenant ID required' });

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
      tenantId,
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

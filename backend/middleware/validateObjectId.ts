/*
 * SPDX-License-Identifier: MIT
 */

import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const validateObjectId = (paramName: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const raw = req.params[paramName];
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `Invalid ${paramName}` });
    return;
  }
  next();
};

export default validateObjectId;
export { validateObjectId };

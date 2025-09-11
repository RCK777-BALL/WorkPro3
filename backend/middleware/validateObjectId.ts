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
  const id = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `Invalid ${paramName}` });
    return;
  }
  next();
};

export default validateObjectId;
export { validateObjectId };

import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import { AuthedRequest } from '../types/AuthedRequest';
import { AuthedRequestHandler } from '../types/AuthedRequestHandler';

export const validate: AuthedRequestHandler<unknown, any, any> = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

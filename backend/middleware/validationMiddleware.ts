import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthedRequest, AuthedRequestHandler } from '../types/http';

export const validate: AuthedRequestHandler = (
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

import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Invalid request',
          details: parsed.error.flatten(),
        },
      });
    }
    req.body = parsed.data;
    return next();
  };

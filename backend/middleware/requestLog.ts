import type { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import logger from '../utils/logger';

morgan.token('tenantId', (req: Request) => (req.tenantId ? String(req.tenantId) : '-'));
morgan.token('userId', (req: Request) => {
  const user = (req as any).user as any;
  return user?._id || user?.id || '-';
});

const format = ':method :url :status :response-time ms tenant=:tenantId user=:userId';

const requestLog = morgan(format, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
});

export default requestLog as unknown as (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

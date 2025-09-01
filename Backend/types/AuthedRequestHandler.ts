 
import { Response, NextFunction, RequestHandler } from 'express';
 
import { AuthedRequest } from './AuthedRequest';

export type AuthedRequestHandler<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
 
> = ((
  req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody, Locals>,
  next: NextFunction
) => Response<ResBody, Locals> | Promise<Response<ResBody, Locals> | void> | void) &
  RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>;
 

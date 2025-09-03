import { Request, Response, NextFunction } from 'express';

/**
 * Handle incoming work order webhook events. The endpoint currently just
 * acknowledges receipt and logs the payload.
 */
export const handleWorkOrderHook = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // In a real implementation the payload could be validated and used to
  // create or update work orders. For now we simply log it.
  console.log('Webhook received:', req.body);
  res.json({ status: 'received' });
};

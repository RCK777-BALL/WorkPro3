import type { Response } from 'express';

export const getJwtSecret = (
  res: Response,
  includeVendor = false,
): string | undefined => {
  const secret = includeVendor
    ? process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET
    : process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: 'Server configuration issue' });
    return undefined;
  }

  return secret;
};

export default getJwtSecret;

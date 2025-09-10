import jwt from 'jsonwebtoken';

export interface JwtData {
  _id?: { toString(): string } | string;
  id?: string;
  email?: string;
  tenantId?: { toString(): string } | string;
  [key: string]: any;
}

/**
 * Create a JWT with a 7 day expiration.
 * Accepts an object containing user data. If `_id` is provided, it will be
 * converted to an `id` string. `tenantId` values will also be stringified.
 */
export const createJwt = (data: JwtData, secret: string): string => {
  const payload: Record<string, any> = { ...data };

  if (data._id) {
    payload.id = typeof data._id === 'string' ? data._id : data._id.toString();
    delete payload._id;
  }

  if (data.tenantId && typeof data.tenantId !== 'string') {
    payload.tenantId = data.tenantId.toString();
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

export default createJwt;

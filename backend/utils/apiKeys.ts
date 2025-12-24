/*
 * SPDX-License-Identifier: MIT
 */

import crypto from 'crypto';

export interface GeneratedApiKey {
  key: string;
  keyHash: string;
  prefix: string;
}

export const hashApiKey = (key: string): string =>
  crypto.createHash('sha256').update(key).digest('hex');

export const generateApiKey = (): GeneratedApiKey => {
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = key.slice(0, 8);
  return { key, keyHash: hashApiKey(key), prefix };
};

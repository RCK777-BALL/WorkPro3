/*
 * SPDX-License-Identifier: MIT
 */

export const getJwtSecret = (
  env: NodeJS.ProcessEnv = process.env,
  includeVendor = false,
): string => {
  const secret = includeVendor
    ? env.VENDOR_JWT_SECRET || env.JWT_SECRET
    : env.JWT_SECRET;

  if (!secret) {
    throw new Error('Server configuration issue');
  }

  return secret;
};

export default getJwtSecret;

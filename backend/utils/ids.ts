/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export const toEntityId = (
  id?: string | Types.ObjectId,
): Types.ObjectId | undefined => {
  if (typeof id === 'string') return new Types.ObjectId(id);
  return id;
};

export default toEntityId;

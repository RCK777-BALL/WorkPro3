/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';

export function toEntityId(id: string | Types.ObjectId): string {
  return id instanceof Types.ObjectId ? id.toString() : String(id);
}


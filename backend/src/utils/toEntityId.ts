import { Types } from 'mongoose';

export function toEntityId(id?: string | Types.ObjectId) {
  if (!id) return undefined;
  return typeof id === 'string' ? id : id.toString();
}

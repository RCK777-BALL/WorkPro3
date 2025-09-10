import { Types } from 'mongoose';
import type { UserRole } from '../../models/User';

export interface RequestUser {
  id?: string;
  _id?: Types.ObjectId | string;
  email: string;
  role?: UserRole;
  tenantId?: string;
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
}

export {};

/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthRole } from '../Backend/shared/auth';
import { AUTH_ROLES } from '../Backend/shared/auth';

export const ROLES = AUTH_ROLES;

export type UserRole = AuthRole;

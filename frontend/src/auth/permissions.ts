/*
 * SPDX-License-Identifier: MIT
 */

import permissionsMatrix from '../../../backend/src/auth/permissions.json';
import type { PermissionAction, PermissionScope, PermissionsMatrix } from '@shared/auth';

const typedPermissionsMatrix: PermissionsMatrix = permissionsMatrix;

export { typedPermissionsMatrix as permissionsMatrix };
export type { PermissionsMatrix, PermissionScope, PermissionAction };

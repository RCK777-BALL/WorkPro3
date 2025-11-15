/*
 * SPDX-License-Identifier: MIT
 */

import permissionsMatrix from '../../../backend/src/auth/permissions.json';

export type PermissionsMatrix = typeof permissionsMatrix;
export type PermissionScope = keyof PermissionsMatrix;
export type PermissionAction<S extends PermissionScope = PermissionScope> = keyof PermissionsMatrix[S];

export { permissionsMatrix };

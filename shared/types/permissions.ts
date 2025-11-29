/*
 * SPDX-License-Identifier: MIT
 */

export const PERMISSIONS = {
  workRequests: {
    read: 'workRequests.read',
    convert: 'workRequests.convert',
  },
  roles: {
    read: 'roles.read',
    manage: 'roles.manage',
  },
  hierarchy: {
    read: 'hierarchy.read',
    write: 'hierarchy.write',
    delete: 'hierarchy.delete',
  },
  inventory: {
    read: 'inventory.read',
    manage: 'inventory.manage',
    purchase: 'inventory.purchase',
  },
  pm: {
    read: 'pm.read',
    write: 'pm.write',
    delete: 'pm.delete',
  },
  importExport: {
    import: 'importExport.import',
    export: 'importExport.export',
  },
  executive: {
    read: 'executive.read',
    manage: 'executive.manage',
  },
  audit: {
    read: 'audit.read',
  },
} as const;

export type PermissionCategory = keyof typeof PERMISSIONS;
export type PermissionAction<C extends PermissionCategory = PermissionCategory> = keyof (typeof PERMISSIONS)[C];
export type PermissionWildcard = '*' | `${PermissionCategory}.*`;
export type Permission = (typeof PERMISSIONS)[PermissionCategory][PermissionAction] | PermissionWildcard;

const permissionValues = Object.values(PERMISSIONS).flatMap((group) =>
  Object.values(group) as (typeof PERMISSIONS)[PermissionCategory][PermissionAction][],
);

export const ALL_PERMISSIONS: Permission[] = Array.from(
  new Set(permissionValues),
) as Permission[];

export const formatPermission = (scope: string, action?: string): Permission => {
  const normalizedScope = scope.trim();
  const key = action ? `${normalizedScope}.${action}` : normalizedScope;
  return key.toLowerCase() as Permission;
};

export const permissionFromParts = <C extends PermissionCategory>(
  scope: C,
  action: PermissionAction<C>,
): Permission => PERMISSIONS[scope][action] as Permission;

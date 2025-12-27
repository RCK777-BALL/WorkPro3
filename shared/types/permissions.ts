/*
 * SPDX-License-Identifier: MIT
 */

export const PERMISSIONS = {
  sites: {
    read: 'sites.read',
    manage: 'sites.manage',
  },
  assets: {
    read: 'assets.read',
    write: 'assets.write',
    delete: 'assets.delete',
  },
  workOrders: {
    read: 'workorders.read',
    write: 'workorders.write',
    approve: 'workorders.approve',
  },
  workRequests: {
    read: 'workrequests.read',
    convert: 'workrequests.convert',
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
    import: 'importexport.import',
    export: 'importexport.export',
  },
  executive: {
    read: 'executive.read',
    manage: 'executive.manage',
  },
  reports: {
    read: 'reports.read',
    build: 'reports.build',
    export: 'reports.export',
  },
  audit: {
    read: 'audit.read',
  },
} as const;

type KnownPermissionCategory = keyof typeof PERMISSIONS;

export type PermissionCategory = KnownPermissionCategory | (string & {});
export type PermissionAction<C extends PermissionCategory = PermissionCategory> = C extends KnownPermissionCategory
  ? Extract<keyof (typeof PERMISSIONS)[C], string>
  : string;
export type PermissionWildcard = '*' | `${PermissionCategory}.*`;
export type Permission = `${PermissionCategory}.${PermissionAction}` | PermissionWildcard;

const permissionValues = Object.values(PERMISSIONS).flatMap((group) => Object.values(group) as string[]);

export const ALL_PERMISSIONS: Permission[] = Array.from(
  new Set(permissionValues),
) as Permission[];

export const formatPermission = (scope: string, action?: string): Permission => {
  const normalizedScope = scope.trim();
  const key = action ? `${normalizedScope}.${action}` : normalizedScope;
  return key.toLowerCase() as Permission;
};

export const permissionFromParts = (
  scope: PermissionCategory,
  action: PermissionAction,
): Permission => formatPermission(scope, action);

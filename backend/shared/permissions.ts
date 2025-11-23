// shared/permissions.ts

export type Permission = string;

export const formatPermission = (category: string, action: string): Permission =>
  `${category.trim()}:${action.trim()}`;

export const CORE_PERMISSION_CATEGORIES = [
  'workorders',
  'assets',
  'pm',
  'inventory',
  'team',
  'settings',
  'analytics',
] as const;

export type PermissionCategory = (typeof CORE_PERMISSION_CATEGORIES)[number];
export type PermissionAction = 'view' | 'edit' | 'create' | 'delete' | 'approve' | 'assign';

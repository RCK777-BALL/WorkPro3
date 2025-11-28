// shared/permissions.ts

export type Permission = string;

export const formatPermission = (category: string, action?: string): Permission => {
  const normalizedCategory = category.trim();
  const normalizedAction = action?.trim();
  const key = normalizedAction ? `${normalizedCategory}.${normalizedAction}` : normalizedCategory;
  return key.toLowerCase() as Permission;
};

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

// Permission actions vary across modules (e.g., read, write, manage, export, import).
// Using a broad string type keeps type safety for the permission strings themselves
// while allowing feature-specific actions without constant type updates.
export type PermissionAction = string;

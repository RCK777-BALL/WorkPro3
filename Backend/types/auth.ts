export const ROLES = [
  'admin',
  'supervisor',
  'planner',
  'tech',
  'manager',
  'technician',
  'viewer',
] as const;

export type UserRole = typeof ROLES[number];

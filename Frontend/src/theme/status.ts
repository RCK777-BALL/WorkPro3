export const statusColors = {
  success: { bg: '#DCFCE7', fg: '#166534', border: '#86EFAC' },
  warning: { bg: '#FFF7D6', fg: '#8A5A00', border: '#F6D365' },
  error: { bg: '#FFE3E2', fg: '#9A1D2B', border: '#F5A4AB' },
  info: { bg: '#E7F0FF', fg: '#18498A', border: '#9BC2FF' },
  neutral: { bg: '#EEF2F9', fg: '#3D4A63', border: '#CAD3E5' },
} as const;

export const statusBadgeMap: Record<string, keyof typeof statusColors> = {
  requested: 'info',
  assigned: 'info',
  in_progress: 'warning',
  completed: 'success',
  approved: 'success',
  cancelled: 'error',
  rejected: 'error',
  paused: 'warning',
  overdue: 'error',
  active: 'success',
  offline: 'error',
  'in repair': 'warning',
};

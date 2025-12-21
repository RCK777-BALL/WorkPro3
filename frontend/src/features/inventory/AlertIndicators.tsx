/*
 * SPDX-License-Identifier: MIT
 */

import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';

import type { InventoryAlert, Part } from '@/types';
import { useAlertsQuery } from './hooks';

const severityStyles: Record<'critical' | 'warning' | 'ok', string> = {
  critical: 'bg-error-50 text-error-700',
  warning: 'bg-warning-50 text-warning-700',
  ok: 'bg-success-50 text-success-700',
};

export const StockLevelBadge = ({ part }: { part: Part }) => {
  const severity = part.alertState?.severity ?? 'ok';
  const threshold = part.alertState?.minimumLevel ?? part.minLevel ?? part.reorderPoint;
  const icon = severity === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />;
  const label = severity === 'ok' ? 'Healthy' : severity === 'critical' ? 'Critical low' : 'Low stock';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[severity]}`}
    >
      {icon}
      <span>
        {label} · {part.quantity} pcs{threshold ? ` · Min ${threshold}` : ''}
      </span>
    </span>
  );
};

const thresholdForAlert = (alert: InventoryAlert) =>
  alert.minLevel && alert.minLevel > 0 ? alert.minLevel : alert.reorderPoint;

export const InventoryAlertIndicator = () => {
  const { data, isLoading } = useAlertsQuery();
  const alerts = data?.items ?? [];
  const openCount = data?.openCount ?? alerts.length;
  const hasCritical = alerts.some((alert) => alert.quantity <= thresholdForAlert(alert) / 2);
  const tone = hasCritical
    ? 'bg-error-50 text-error-700'
    : alerts.length > 0
      ? 'bg-warning-50 text-warning-700'
      : 'bg-success-50 text-success-700';
  const icon = hasCritical ? <AlertTriangle size={14} /> : alerts.length > 0 ? <Bell size={14} /> : <CheckCircle2 size={14} />;
  const label = isLoading
    ? 'Checking alerts…'
    : `${openCount} low-stock notification${openCount === 1 ? '' : 's'}`;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

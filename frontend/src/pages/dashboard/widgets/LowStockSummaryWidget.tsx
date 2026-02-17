/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useNotifications } from '@/store/notificationsSlice';

const statusTone: Record<'ok' | 'warning' | 'critical', string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
};

export function LowStockSummaryWidget() {
  const lowStockAlerts = useNotifications((state) => state.lowStockAlerts);
  const alertsLoading = useNotifications((state) => state.alertsLoading);
  const alertsError = useNotifications((state) => state.alertsError);
  const fetchLowStock = useNotifications((state) => state.fetchLowStock);
  const acknowledge = useNotifications((state) => state.acknowledge);
  const clear = useNotifications((state) => state.clear);

  useEffect(() => {
    if (alertsLoading || lowStockAlerts.length > 0) return;
    void fetchLowStock();
  }, [alertsLoading, fetchLowStock, lowStockAlerts.length]);

  const sortedAlerts = useMemo(
    () =>
      [...lowStockAlerts].sort((a, b) => {
        const leftSeverity = severityFor(a);
        const rightSeverity = severityFor(b);
        if (leftSeverity !== rightSeverity) {
          return severityRank(rightSeverity) - severityRank(leftSeverity);
        }
        return (a.quantity ?? 0) - (b.quantity ?? 0);
      }),
    [lowStockAlerts],
  );

  const renderBody = () => {
    if (alertsLoading) {
      return <div className="text-sm text-[var(--wp-color-text-muted)]">Loading low stock…</div>;
    }
    if (alertsError) {
      return (
        <div className="space-y-3 text-sm text-red-700">
          <p>{alertsError}</p>
          <Button size="sm" variant="outline" onClick={() => fetchLowStock()}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      );
    }
    if (sortedAlerts.length === 0) {
      return <div className="text-sm text-[var(--wp-color-text-muted)]">No low stock parts right now.</div>;
    }

    return (
      <ul className="space-y-3">
        {sortedAlerts.map((alert) => {
          const severity = severityFor(alert);
          const threshold = alert.reorderPoint ?? 0;
          return (
            <li key={alert.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusTone[severity]}`}>
                      {severityLabel(severity)}
                    </span>
                    <span className="text-[var(--wp-color-text)]">{alert.partName}</span>
                    {alert.acknowledged ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Acknowledged
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">Threshold: {threshold} • On hand: {alert.quantity}</p>
                  {alert.assetNames?.length ? (
                    <p className="text-xs text-[var(--wp-color-text-muted)]">Assets: {alert.assetNames.join(', ')}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 text-xs text-[var(--wp-color-text-muted)]">
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => acknowledge(alert.id)}
                      disabled={alert.acknowledged}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Ack
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => clear(alert.id)}
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Card
      title="Low Stock Summary"
      subtitle="Parts at or below configured reorder points"
      icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
    >
      {renderBody()}
    </Card>
  );
}

function severityFor(alert: { quantity: number; reorderPoint: number }) {
  if (alert.quantity <= 0) return 'critical' as const;
  if (alert.quantity <= alert.reorderPoint) return 'warning' as const;
  return 'ok' as const;
}

function severityRank(severity: 'ok' | 'warning' | 'critical') {
  switch (severity) {
    case 'critical':
      return 2;
    case 'warning':
      return 1;
    default:
      return 0;
  }
}

function severityLabel(severity: 'ok' | 'warning' | 'critical') {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Low';
  return 'Healthy';
}


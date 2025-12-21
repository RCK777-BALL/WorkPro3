/*
 * SPDX-License-Identifier: MIT
 */

import { AlertTriangle } from 'lucide-react';

import { useAlertsQuery } from './hooks';

const AlertsPanel = () => {
  const { data, isLoading, error } = useAlertsQuery();
  const alerts = data?.items ?? [];
  const alertCount = data?.openCount ?? alerts.length;
  const thresholdForAlert = (alert: (typeof alerts)[number]) =>
    alert.minLevel && alert.minLevel > 0 ? alert.minLevel : alert.reorderPoint;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Reorder alerts</p>
          <p className="text-xs text-neutral-500">Tracked automatically based on stock levels.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700">
          <AlertTriangle size={14} />
          {alertCount}
        </span>
      </div>
      {isLoading && <p className="py-4 text-sm text-neutral-500">Checking current inventory…</p>}
      {error && (
        <p className="py-4 text-sm text-error-600">Unable to load alerts. Please try again later.</p>
      )}
      {!isLoading && !error && alerts.length === 0 && (
        <p className="py-4 text-sm text-neutral-500">All parts are above their reorder points.</p>
      )}
      {!isLoading && !error && alerts.length > 0 && (
        <ul className="divide-y divide-neutral-100">
          {alerts.map((alert) => (
            <li key={alert.id} className="py-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{alert.partName}</p>
                  <p className="text-xs text-neutral-500">
                    {alert.quantity} in stock · Minimum {thresholdForAlert(alert)}
                  </p>
                  {alert.vendorName && (
                    <p className="text-xs text-neutral-500">Vendor: {alert.vendorName}</p>
                  )}
                  {alert.assetNames.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      Assets: {alert.assetNames.join(', ')}
                    </p>
                  )}
                  {alert.pmTemplateTitles.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      Templates: {alert.pmTemplateTitles.join(', ')}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    alert.quantity <= thresholdForAlert(alert) / 2
                      ? 'bg-error-50 text-error-700'
                      : 'bg-warning-50 text-warning-700'
                  }`}
                >
                  {alert.quantity <= thresholdForAlert(alert) / 2 ? 'Critical' : 'Warning'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AlertsPanel;

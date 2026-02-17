/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, SkipForward } from "lucide-react";

import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { useAlertsQuery } from "@/features/inventory";
import type { ReorderAlertStatus } from "@/types";

const statusColor: Record<string, string> = {
  open: "bg-warning-50 text-warning-700",
  approved: "bg-success-50 text-success-700",
  skipped: "bg-[var(--wp-color-surface-elevated)] text-[var(--wp-color-text)]",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  approved: "Approved",
  skipped: "Skipped",
};

const ReorderAlerts = () => {
  const { data, isLoading, error } = useAlertsQuery();
  const [decisions, setDecisions] = useState<Record<string, ReorderAlertStatus>>({});
  const hasError = Boolean(error);

  const alerts = useMemo(
    () =>
      (data?.items ?? []).map((alert) => ({
        ...alert,
        status: decisions[alert.partId] ?? (alert as any).status ?? "open",
      })),
    [data, decisions],
  );

  const openAlerts = alerts.filter((alert) => alert.status === "open");

  const handleDecision = (partId: string, decision: "approved" | "skipped") => {
    setDecisions((prev) => ({ ...prev, [partId]: decision }));
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-[var(--wp-color-text-muted)]">Inventory</p>
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Reorder alerts</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Track low stock parts and quickly approve or skip generated reorder suggestions.
        </p>
      </header>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Alerts</Card.Title>
              <Card.Description>Approve to generate a purchase order or skip to silence the alert.</Card.Description>
            </div>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-500" />
              <Badge
                text={`${openAlerts.length} open`}
                color={openAlerts.length ? "warning" : "success"}
              />
            </span>
          </div>
        </Card.Header>
        <Card.Content>
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking inventory…
            </p>
          )}
          {hasError && <p className="text-sm text-error-600">Unable to load reorder alerts.</p>}
          {!isLoading && !hasError && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-[var(--wp-color-surface)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">On hand</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Reorder point</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Vendor</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Linked assets</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {alerts.map((alert) => {
                    const status = alert.status ?? "open";
                    return (
                      <tr key={alert.partId} className="hover:bg-[var(--wp-color-surface)]">
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <div className="font-semibold">{alert.partName}</div>
                          {alert.lastTriggeredAt && (
                            <p className="text-xs text-[var(--wp-color-text-muted)]">
                              Last triggered {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{alert.quantity}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{alert.reorderPoint}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">{alert.vendorName ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          {alert.assetNames.length ? alert.assetNames.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status]}`}>
                            {statusLabel[status] ?? status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--wp-color-text)]">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              icon={<Check className="h-4 w-4" />}
                              onClick={() => handleDecision(alert.partId, "approved")}
                              disabled={status !== "open"}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<SkipForward className="h-4 w-4" />}
                              onClick={() => handleDecision(alert.partId, "skipped")}
                              disabled={status !== "open"}
                            >
                              Skip
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!alerts.length && (
                    <tr>
                      <td className="px-3 py-6 text-center text-[var(--wp-color-text-muted)]" colSpan={7}>
                        All caught up! No reorder alerts are pending.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default ReorderAlerts;


/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, SkipForward } from "lucide-react";

import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { useAlertsQuery } from "@/features/inventory";

const statusColor: Record<string, string> = {
  open: "bg-warning-50 text-warning-700",
  approved: "bg-success-50 text-success-700",
  skipped: "bg-neutral-100 text-neutral-700",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  approved: "Approved",
  skipped: "Skipped",
};

const ReorderAlerts = () => {
  const { data, isLoading, error } = useAlertsQuery();
  const [decisions, setDecisions] = useState<Record<string, "approved" | "skipped">>({});

  const alerts = useMemo(
    () =>
      (data ?? []).map((alert) => ({
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
        <p className="text-sm text-neutral-500">Inventory</p>
        <h1 className="text-2xl font-semibold text-neutral-900">Reorder alerts</h1>
        <p className="text-sm text-neutral-600">
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
            <Badge
              text={`${openAlerts.length} open`}
              color={openAlerts.length ? "warning" : "success"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
        </Card.Header>
        <Card.Content>
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-neutral-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking inventory…
            </p>
          )}
          {error && <p className="text-sm text-error-600">Unable to load reorder alerts.</p>}
          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">On hand</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Reorder point</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Vendor</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Linked assets</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {alerts.map((alert) => {
                    const status = alert.status ?? "open";
                    return (
                      <tr key={alert.partId} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 text-neutral-900">
                          <div className="font-semibold">{alert.partName}</div>
                          <p className="text-xs text-neutral-500">Lead time: {alert.leadTime ?? 0} days</p>
                        </td>
                        <td className="px-3 py-2 text-neutral-700">{alert.quantity}</td>
                        <td className="px-3 py-2 text-neutral-700">{alert.reorderPoint}</td>
                        <td className="px-3 py-2 text-neutral-700">{alert.vendorName ?? "—"}</td>
                        <td className="px-3 py-2 text-neutral-700">
                          {alert.assetNames.length ? alert.assetNames.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[status]}`}>
                            {statusLabel[status] ?? status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-neutral-700">
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
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={7}>
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

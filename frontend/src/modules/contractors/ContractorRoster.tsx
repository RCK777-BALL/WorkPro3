/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import TableLayoutControls from "@/components/common/TableLayoutControls";
import http from "@/lib/http";
import type { ContractorRosterEntry } from "./types";
import { useTableLayout } from "@/hooks/useTableLayout";
import { useAuth } from "@/context/AuthContext";

const formatWarningLabel = (warnings: string[]) => {
  if (warnings.length === 0) return "Clear";
  if (warnings.length === 1) return warnings[0];
  return `${warnings[0]} (+${warnings.length - 1} more)`;
};

const ContractorRoster = () => {
  const { user } = useAuth();
  const [roster, setRoster] = useState<ContractorRosterEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRoster = async () => {
      setLoading(true);
      try {
        const res = await http.get("/contractors/roster");
        const payload = (res.data as { data?: ContractorRosterEntry[] })?.data ?? [];
        setRoster(payload);
      } catch (error) {
        console.error("Unable to load contractors", error);
        setRoster([]);
      } finally {
        setLoading(false);
      }
    };

    loadRoster();
  }, []);

  const summary = useMemo(() => {
    const assignable = roster.filter((entry) => entry.eligibility.eligible).length;
    const blocked = roster.length - assignable;
    const expiring = roster.filter((entry) => entry.eligibility.warnings.length > 0).length;
    return { assignable, blocked, expiring };
  }, [roster]);

  const columns = useMemo(
    () => [
      {
        id: "contractor",
        header: "Contractor",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-100">{entry.name}</div>
            <div className="text-sm text-slate-300">{entry.role}</div>
            {entry.vendor && (
              <div className="text-xs text-slate-400">
                Vendor: {entry.vendor.name} · {entry.vendor.contactName}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="space-y-1">
            <StatusBadge status={entry.onboarding.status} size="sm" />
            <div className="flex gap-1 flex-wrap text-xs text-slate-300">
              <Badge text={entry.approvals.safety ? "Safety approved" : "Safety pending"} type="status" size="sm" />
              <Badge
                text={entry.approvals.insurance ? "Insurance approved" : "Insurance pending"}
                type="status"
                size="sm"
              />
              <Badge
                text={entry.approvals.operations ? "Operations approved" : "Operations pending"}
                type="status"
                size="sm"
              />
            </div>
          </div>
        ),
      },
      {
        id: "eligibility",
        header: "Eligibility",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="space-y-1">
            <Badge
              text={entry.eligibility.eligible ? "Assignable" : "Blocked"}
              type="status"
              className={entry.eligibility.eligible ? "" : "bg-red-100 text-red-700"}
            />
            <div className="text-xs text-slate-300">
              {entry.eligibility.blockers.length > 0
                ? entry.eligibility.blockers[0]
                : "All controls satisfied"}
            </div>
          </div>
        ),
      },
      {
        id: "warnings",
        header: "Warnings",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="text-sm text-amber-200">
            {formatWarningLabel(entry.eligibility.warnings)}
          </div>
        ),
      },
      {
        id: "vendor",
        header: "Vendor Contact",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="text-sm text-slate-200 leading-tight">
            {entry.vendor ? (
              <>
                <div>{entry.vendor.contactName}</div>
                <div className="text-xs text-slate-400">{entry.vendor.phone}</div>
                <div className="text-xs text-slate-400">{entry.vendor.email}</div>
              </>
            ) : (
              <span className="text-slate-400">No vendor linked</span>
            )}
          </div>
        ),
      },
    ],
    [roster],
  );

  const columnOptions = useMemo(
    () => columns.map((column) => ({ id: column.id ?? column.header, label: column.header })),
    [columns],
  );

  const tableLayout = useTableLayout({
    tableKey: "contractor-roster",
    columnIds: columnOptions.map((column) => column.id),
    userId: user?.id,
  });

  const columnLookup = useMemo(
    () => new Map(columns.map((column) => [column.id ?? column.header, column])),
    [columns],
  );

  const visibleColumns = useMemo(
    () =>
      tableLayout.visibleColumnOrder
        .map((id) => columnLookup.get(id))
        .filter(Boolean) as typeof columns,
    [columnLookup, tableLayout.visibleColumnOrder],
  );

  const handleSaveLayout = (name: string) => tableLayout.saveLayout(name, {});

  const handleApplyLayout = (layoutId: string) => {
    tableLayout.applyLayout(layoutId);
  };

  const shareLayoutLink = (layoutId?: string) => {
    const targetState = layoutId
      ? tableLayout.savedLayouts.find((layout) => layout.id === layoutId)?.state
      : tableLayout.preferences;
    return tableLayout.getShareableLink(targetState ?? tableLayout.preferences);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Assignable"
          subtitle="Ready for dispatch"
          className="bg-emerald-900/40 border-emerald-700"
        >
          <div className="text-3xl font-semibold text-emerald-200">{summary.assignable}</div>
        </Card>
        <Card
          title="Blocked"
          subtitle="Resolve approvals or credentials"
          className="bg-red-900/30 border-red-700"
        >
          <div className="text-3xl font-semibold text-red-100">{summary.blocked}</div>
        </Card>
        <Card
          title="Expiring Soon"
          subtitle="Credentials needing attention"
          className="bg-amber-900/30 border-amber-700"
        >
          <div className="text-3xl font-semibold text-amber-100">{summary.expiring}</div>
        </Card>
      </div>

      <Card title="Contractor Roster" subtitle="Onboarding state, approvals, and eligibility checks">
        <div className="space-y-4">
          <TableLayoutControls
            columns={columnOptions}
            columnOrder={tableLayout.columnOrder}
            hiddenColumns={tableLayout.hiddenColumns}
            onToggleColumn={tableLayout.toggleColumn}
            onMoveColumn={tableLayout.moveColumn}
            onReset={tableLayout.resetLayout}
            onSaveLayout={handleSaveLayout}
            savedLayouts={tableLayout.savedLayouts}
            onApplyLayout={handleApplyLayout}
            onShareLayout={shareLayoutLink}
            activeLayoutId={tableLayout.activeLayoutId}
          />
          <DataTable
            columns={visibleColumns}
            data={roster}
            keyField="id"
            isLoading={loading}
            emptyMessage="No contractors yet"
            variant="dark"
            sortState={tableLayout.sort ?? undefined}
            onSortChange={(state) => tableLayout.setSort(state ?? null)}
          />
        </div>
      </Card>
    </div>
  );
};

export default ContractorRoster;


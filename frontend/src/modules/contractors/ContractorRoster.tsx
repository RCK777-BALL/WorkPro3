/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import http from "@/lib/http";
import type { ContractorRosterEntry } from "./types";

const formatWarningLabel = (warnings: string[]) => {
  if (warnings.length === 0) return "Clear";
  if (warnings.length === 1) return warnings[0];
  return `${warnings[0]} (+${warnings.length - 1} more)`;
};

const ContractorRoster = () => {
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
        header: "Warnings",
        accessor: (entry: ContractorRosterEntry) => (
          <div className="text-sm text-amber-200">
            {formatWarningLabel(entry.eligibility.warnings)}
          </div>
        ),
      },
      {
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
        <DataTable
          columns={columns}
          data={roster}
          keyField="id"
          isLoading={loading}
          emptyMessage="No contractors yet"
          variant="dark"
        />
      </Card>
    </div>
  );
};

export default ContractorRoster;

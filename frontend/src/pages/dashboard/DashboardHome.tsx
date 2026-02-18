/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "@/lib/http";
import { useToast } from "@/context/ToastContext";
import RecentActivity from "@/components/dashboard/RecentActivity";
import type { AuditLog } from "@/features/audit";
import EmailPreferencesCard from "@/components/dashboard/EmailPreferencesCard";
import { Sparkline } from "@/components/charts/Sparkline";
import {
  ClipboardList,
  Timer,
  Boxes,
  Activity,
  ChevronRight,
  Plus,
  AlertTriangle,
  PieChart as PieChartIcon,
} from "lucide-react";
import { KpiDashboardWidget, LowStockSummaryWidget } from "./widgets";

/** ---- Types ---- */
type Summary = {
  pmCompliance: number;
  woBacklog: number;
  downtimeThisMonth: number;
  costMTD: number;
  cmVsPmRatio: number;
  wrenchTimePct: number;
  pmComplianceTrend: number[];
  woBacklogTrend: number[];
};

type RecentWorkOrder = {
  id: string;
  title: string;
  line?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "On Hold" | "Completed";
  updatedAt: string; // ISO
};

type DashboardActivity = {
  id: string;
  type: string;
  action: string;
  ref?: string | null;
  user?: string;
  time?: string;
  link?: string | null;
};

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<RecentWorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setError(null);
        const [sumRes, woRes] = await Promise.all([
          http.get<Summary>("/summary"),
          http.get<RecentWorkOrder[]>("/workorders", {
            params: { limit: 5, sort: "-updatedAt" },
          }),
        ]);

        if (!cancelled) {
          setSummary(sumRes.data);
          setRecent(woRes.data);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load dashboard data");
          addToast("Failed to load dashboard data", "error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const fetchActivity = async () => {
    try {
      setActivityError(null);
      setActivityLoading(true);
      const res = await http.get<DashboardActivity[]>("/dashboard/recent-activity", {
        params: { limit: 10 },
      });

      const items: AuditLog[] = Array.isArray(res.data)
        ? res.data.map((item) => ({
            _id: item.id,
            entityType: item.type,
            entityId: item.ref ?? undefined,
            entity: item.ref ? { type: item.type, id: item.ref, label: item.ref } : undefined,
            action: item.action,
            actor: item.user ? { name: item.user } : undefined,
            before: null,
            after: null,
            diff: null,
            ts: item.time ?? new Date().toISOString(),
          }))
        : [];

      setActivityLogs(items);
    } catch {
      setActivityError("Failed to load activity");
      addToast("Failed to load activity", "error");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-100 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Quick view of health, workload, and recent activity.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/work-orders/new"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:bg-muted transition"
              >
                <Plus className="h-4 w-4" />
                Create Work Order
              </Link>
              <Link
                to="/dashboard/assets/new"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:bg-muted transition"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              loading={loading}
              title="PM Compliance"
              value={summary ? summary.pmCompliance.toFixed(2) : "—"}
              icon={<Timer className="h-5 w-5" />}
            />
            <StatCard
              loading={loading}
              title="WO Backlog"
              value={summary ? summary.woBacklog : "—"}
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              loading={loading}
              title="Downtime (This Month)"
              value={summary ? summary.downtimeThisMonth : "—"}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
            <StatCard
              loading={loading}
              title="Cost MTD"
              value={summary ? summary.costMTD : "—"}
              icon={<Boxes className="h-5 w-5" />}
            />
            <StatCard
              loading={loading}
              title="CM vs PM Ratio"
              value={summary ? summary.cmVsPmRatio.toFixed(2) : "—"}
              icon={<PieChartIcon className="h-5 w-5" />}
            />
            <StatCard
              loading={loading}
              title="Wrench Time"
              value={summary ? `${summary.wrenchTimePct.toFixed(1)}%` : "—"}
              icon={<Activity className="h-5 w-5" />}
            />
          </div>

          {/* Trend charts */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TrendChart
              loading={loading}
              title="PM Compliance Trend"
              data={summary ? summary.pmComplianceTrend : []}
              color="#3b82f6"
            />
            <TrendChart
              loading={loading}
              title="WO Backlog Trend"
              data={summary ? summary.woBacklogTrend : []}
              color="#ef4444"
            />
          </div>

          {/* Recent work orders */}
          <div className="rounded-2xl border">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-lg font-semibold">Recent Work Orders</h2>
              <Link
                to="/dashboard/work-orders"
                className="inline-flex items-center gap-1 text-sm"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y">
              {loading ? (
                <SkeletonRows rows={5} />
              ) : recent.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No recent work orders.
                </div>
              ) : (
                recent.map((wo) => <RecentWOItem key={wo.id} wo={wo} />)
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6 lg:mt-0">
          <EmailPreferencesCard />
          <KpiDashboardWidget />
          <LowStockSummaryWidget />
          <RecentActivity
            logs={activityLogs}
            loading={activityLoading}
            error={activityError}
            onRefresh={fetchActivity}
          />
        </div>
      </div>
    </div>
  );
}

/** ---- UI Pieces ---- */

function StatCard(props: {
  loading: boolean;
  title: string;
  value?: number | string;
  icon?: JSX.Element;
  footer?: JSX.Element;
}) {
  const { loading, title, value, icon, footer } = props;
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border p-2">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-6 w-20 animate-pulse rounded bg-muted mt-1" />
          ) : (
            <p className="text-2xl font-semibold leading-tight">{value}</p>
          )}
        </div>
      </div>
      {footer ? <div className="mt-3 text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

function TrendChart({
  loading,
  title,
  data,
  color,
}: {
  loading: boolean;
  title: string;
  data?: number[];
  color: string;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-sm text-muted-foreground mb-2">{title}</p>
      {loading ? (
        <div className="h-16 w-full animate-pulse rounded bg-muted" />
      ) : data && data.length > 0 ? (
        <div className="h-16">
          <Sparkline data={data} color={color} className="h-full w-full" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data</p>
      )}
    </div>
  );
}

function RecentWOItem({ wo }: { wo: RecentWorkOrder }) {
  return (
    <Link
      to={`/dashboard/work-orders/${wo.id}`}
      className="flex items-center justify-between gap-4 p-4 hover:bg-muted/60 transition"
    >
      <div className="min-w-0">
        <p className="font-medium truncate">
          {wo.id} — {wo.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {wo.line ? `${wo.line} • ` : ""}
          <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
          <span className="mx-1">•</span>
          <Badge>{wo.status}</Badge>
        </p>
      </div>
      <p className="text-sm text-muted-foreground whitespace-nowrap">
        {new Date(wo.updatedAt).toLocaleTimeString()}
      </p>
    </Link>
  );
}

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "amber" | "red";
}) {
  const palette =
    tone === "green"
      ? "bg-green-100 text-green-700 border-green-200"
      : tone === "amber"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : tone === "red"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-muted text-foreground border-transparent";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${palette}`}
    >
      {children}
    </span>
  );
}

function priorityTone(
  p: RecentWorkOrder["priority"]
): "default" | "green" | "amber" | "red" {
  switch (p) {
    case "Low":
      return "green";
    case "Medium":
      return "amber";
    case "High":
    case "Critical":
      return "red";
    default:
      return "default";
  }
}



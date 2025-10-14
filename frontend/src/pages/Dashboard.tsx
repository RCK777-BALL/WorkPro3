/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  ChevronRight,
  LineChart,
  Loader2,
  Plus,
  ShieldCheck,
  UploadCloud,
  Workflow,
} from "lucide-react";

import KpiCard from "@/components/dashboard/KpiCard";
import RecentActivity, { AuditLog } from "@/components/dashboard/RecentActivity";
import { Sparkline } from "@/components/charts/Sparkline";
import Button from "@/components/ui/button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import useApi from "@/hooks/useApi";
import http from "@/lib/http";
import type { SafetyKpiResponse } from "@/types";

interface Summary {
  pmCompliance: number;
  woBacklog: number;
  downtimeThisMonth: number;
  costMTD: number;
  cmVsPmRatio: number;
  wrenchTimePct: number;
}

type Trends = Record<keyof Summary, number[]>;

interface DashboardOverview {
  livePulse: {
    criticalAlerts: number;
    maintenanceDue: number;
    complianceScore: number;
    updatedAt?: string;
  };
  commandCenter: {
    activeWorkOrders: number;
    overdueWorkOrders: number;
    openPermits: number;
    techniciansDispatched: number;
  };
  analytics: {
    lastUpdatedAt: string | null;
    completionRate: number;
    criticalBacklog: number;
  };
  reports: {
    generatedThisWeek: number;
    scheduledReports: number;
    lastExportAt: string | null;
  };
  permits: {
    pending: number;
    expiringSoon: number;
  };
  workOrders: {
    active: number;
    completedToday: number;
    onTimeCompletionRate: number;
  };
  imports: {
    lastSync: string | null;
    processedItems: number;
    failed: number;
  };
}

interface DashboardWorkOrderResponse {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  updatedAt?: string | null;
  assetName?: string | null;
}

interface PermitPreview {
  id: string;
  number: string;
  type: string;
  status: string;
  riskLevel?: string | null;
  validTo?: string | null;
  updatedAt?: string | null;
}

type RecentWorkOrder = {
  id: string;
  title: string;
  assetName?: string | null;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  updatedAt: string;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [safetyKpis, setSafetyKpis] = useState<SafetyKpiResponse | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recent, setRecent] = useState<RecentWorkOrder[]>([]);
  const [permits, setPermits] = useState<PermitPreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = user?.role ?? "admin";
  const isAdmin = ["admin", "supervisor", "manager"].includes(role);
  const isTech = ["tech", "technician", "planner"].includes(role);
  const canLaunchPlanner = isAdmin || isTech;
  const canRunImports = isAdmin;

  const {
    request: fetchOverview,
    loading: overviewLoading,
    error: overviewErrorMessage,
  } = useApi<DashboardOverview>();
  const {
    request: fetchWorkOrders,
    loading: workOrdersLoading,
    error: workOrdersErrorMessage,
  } = useApi<DashboardWorkOrderResponse[]>();
  const {
    request: fetchPermits,
    loading: permitsLoading,
    error: permitsErrorMessage,
  } = useApi<PermitPreview[]>();
  const {
    request: syncImports,
    loading: syncingImports,
    error: importsErrorMessage,
  } = useApi<{ processedCount: number; syncedAt: string }>();
  const { request: recordPlanner, loading: launchingPlanner } = useApi<{ message: string }>();

  const refreshOverview = useCallback(
    async (notify = false) => {
      try {
        const data = await fetchOverview("/dashboard/overview");
        setOverview(data);
        if (notify) addToast("Dashboard overview updated");
      } catch (err) {
        if (notify) addToast("Failed to refresh overview", "error");
      }
    },
    [fetchOverview, addToast],
  );

  const loadWorkOrders = useCallback(
    async (notify = true) => {
      try {
        const data = await fetchWorkOrders("/dashboard/workorders?limit=5");
        const normalized = data.map(mapWorkOrderSummary);
        setRecent(normalized);
        if (notify) addToast("Loaded work orders");
      } catch (err) {
        if (notify) addToast("Failed to load work orders", "error");
      }
    },
    [fetchWorkOrders, addToast],
  );

  const loadPermits = useCallback(
    async (notify = true) => {
      try {
        const data = await fetchPermits("/dashboard/permits?limit=5");
        const mapped = data.map((permit) => ({
          ...permit,
          status: formatStatus(permit.status),
        }));
        setPermits(mapped);
        if (notify) addToast("Loaded permit activity");
      } catch (err) {
        if (notify) addToast("Failed to load permits", "error");
      }
    },
    [fetchPermits, addToast],
  );

  const fetchSafetyKpis = useCallback(async () => {
    try {
      const res = await http.get<SafetyKpiResponse>("/permits/kpis");
      setSafetyKpis(res.data);
    } catch (err) {
      console.error("Failed to load safety KPIs", err);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await http.get<AuditLog[]>("/audit", { params: { limit: 10 } });
      setLogs(res.data);
      setLogsError(null);
    } catch (err) {
      setLogsError("Failed to load activity");
      addToast("Failed to load activity", "error");
    } finally {
      setLoadingLogs(false);
    }
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setError(null);
        const [summaryRes, trendsRes] = await Promise.all([
          http.get<Summary>("/summary"),
          http.get<Trends>("/summary/trends"),
        ]);
        if (!cancelled) {
          setSummary(summaryRes.data);
          setTrends(trendsRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load summary");
          addToast("Failed to load summary", "error");
        }
      }
    };

    fetchData();
    void refreshOverview();
    void loadWorkOrders(false);
    void loadPermits(false);
    void fetchSafetyKpis();
    void refreshLogs();

    return () => {
      cancelled = true;
    };
  }, [addToast, refreshOverview, loadWorkOrders, loadPermits, fetchSafetyKpis, refreshLogs]);

  const calcDelta = (series: number[] = []) => {
    if (series.length < 2) return 0;
    const first = series[0];
    const last = series[series.length - 1];
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  };

  const kpis = useMemo(
    () =>
      summary && trends
        ? [
            {
              key: "pmCompliance",
              title: "PM Compliance",
              value: `${Math.round(summary.pmCompliance * 100)}%`,
              deltaPct: calcDelta(trends.pmCompliance),
              series: trends.pmCompliance,
            },
            {
              key: "woBacklog",
              title: "WO Backlog",
              value: summary.woBacklog,
              deltaPct: calcDelta(trends.woBacklog),
              series: trends.woBacklog,
            },
            {
              key: "downtimeThisMonth",
              title: "Downtime (hrs)",
              value: summary.downtimeThisMonth,
              deltaPct: calcDelta(trends.downtimeThisMonth),
              series: trends.downtimeThisMonth,
            },
            {
              key: "costMTD",
              title: "Cost MTD",
              value: `$${summary.costMTD}`,
              deltaPct: calcDelta(trends.costMTD),
              series: trends.costMTD,
            },
            {
              key: "cmVsPmRatio",
              title: "CM vs PM Ratio",
              value: summary.cmVsPmRatio.toFixed(2),
              deltaPct: calcDelta(trends.cmVsPmRatio),
              series: trends.cmVsPmRatio,
            },
            {
              key: "wrenchTimePct",
              title: "Wrench Time %",
              value: `${summary.wrenchTimePct.toFixed(1)}%`,
              deltaPct: calcDelta(trends.wrenchTimePct),
              series: trends.wrenchTimePct,
            },
          ]
        : [],
    [summary, trends],
  );

  const handleSyncImports = useCallback(async () => {
    if (!canRunImports) {
      addToast("Admin access required for data sync", "error");
      return;
    }
    try {
      const result = await syncImports("/dashboard/imports/sync", "POST");
      addToast(`Synced ${result.processedCount.toLocaleString()} records`);
      await refreshOverview();
    } catch (err) {
      addToast("Sync failed", "error");
    }
  }, [canRunImports, syncImports, addToast, refreshOverview]);

  const handleLaunchPlanner = useCallback(async () => {
    if (!canLaunchPlanner) {
      addToast("Planner access is limited to technicians", "error");
      return;
    }
    try {
      await recordPlanner("/dashboard/command-center/launch", "POST");
      addToast("Planner launch recorded");
    } catch (err) {
      addToast("Unable to record planner launch", "error");
    }
  }, [canLaunchPlanner, recordPlanner, addToast]);

  const handleOpenAnalytics = useCallback(async () => {
    await refreshOverview();
    navigate("/analytics");
  }, [refreshOverview, navigate]);

  const handleOpenReports = useCallback(async () => {
    await refreshOverview();
    navigate("/reports");
  }, [refreshOverview, navigate]);

  const handleViewWorkOrders = useCallback(() => {
    void loadWorkOrders();
  }, [loadWorkOrders]);

  const handleViewPermits = useCallback(() => {
    void loadPermits();
  }, [loadPermits]);

  const overviewErrors = [error, overviewErrorMessage, workOrdersErrorMessage, permitsErrorMessage, importsErrorMessage].filter(Boolean);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Command Center</h1>
            <p className="text-sm text-white/70">
              Monitor teams, maintenance, and compliance from a single view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/dashboard/work-orders/new"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Create Work Order
            </Link>
            <Link
              to="/dashboard/assets/new"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add Asset
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshOverview(true)}
              disabled={overviewLoading}
            >
              {overviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh data
            </Button>
          </div>
        </header>

        {overviewErrors.length > 0 && (
          <div className="space-y-2">
            {overviewErrors.map((msg, index) => (
              <div
                key={index}
                className="rounded-2xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-100"
              >
                {msg}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ModuleCard
            title="Command Center"
            description="Dispatch readiness and workload"
            icon={Activity}
            metrics={[
              { label: "Active work orders", value: formatNumber(overview?.commandCenter.activeWorkOrders) },
              { label: "Overdue", value: formatNumber(overview?.commandCenter.overdueWorkOrders) },
              { label: "Technicians dispatched", value: formatNumber(overview?.commandCenter.techniciansDispatched) },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="Launch planner"
            onAction={handleLaunchPlanner}
            actionDisabled={!canLaunchPlanner}
            actionLoading={launchingPlanner}
            roleNotice={!canLaunchPlanner ? "Technician or admin role required" : undefined}
          />
          <ModuleCard
            title="Analytics"
            description="Performance and response time trends"
            icon={LineChart}
            metrics={[
              {
                label: "Completion rate",
                value: formatPercent(overview?.analytics.completionRate),
              },
              {
                label: "Critical backlog",
                value: formatNumber(overview?.analytics.criticalBacklog),
              },
              {
                label: "Last updated",
                value: formatDate(overview?.analytics.lastUpdatedAt),
              },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="Open analytics"
            onAction={handleOpenAnalytics}
          />
          <ModuleCard
            title="Reports"
            description="Exports and scheduled summaries"
            icon={BarChart3}
            metrics={[
              {
                label: "Generated this week",
                value: formatNumber(overview?.reports.generatedThisWeek),
              },
              {
                label: "Scheduled",
                value: formatNumber(overview?.reports.scheduledReports),
              },
              {
                label: "Last export",
                value: formatDate(overview?.reports.lastExportAt),
              },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="View reports"
            onAction={handleOpenReports}
          />
          <ModuleCard
            title="Safety permits"
            description="Approval and expiry watchlist"
            icon={ShieldCheck}
            metrics={[
              { label: "Pending approvals", value: formatNumber(overview?.permits.pending) },
              { label: "Expiring soon", value: formatNumber(overview?.permits.expiringSoon) },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="Refresh permits"
            onAction={handleViewPermits}
            actionLoading={permitsLoading}
          >
            <PermitList permits={permits} loading={permitsLoading} error={permitsErrorMessage ?? undefined} />
          </ModuleCard>
          <ModuleCard
            title="Work orders"
            description="Execution pace and schedule adherence"
            icon={Workflow}
            metrics={[
              { label: "Active", value: formatNumber(overview?.workOrders.active) },
              { label: "Completed today", value: formatNumber(overview?.workOrders.completedToday) },
              {
                label: "On-time completion",
                value: formatPercent(overview?.workOrders.onTimeCompletionRate),
              },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="Refresh work orders"
            onAction={handleViewWorkOrders}
            actionLoading={workOrdersLoading}
          >
            <WorkOrderPreviewList workOrders={recent.slice(0, 3)} loading={workOrdersLoading} />
          </ModuleCard>
          <ModuleCard
            title="Data imports"
            description="Sync spreadsheets and asset catalogs"
            icon={UploadCloud}
            metrics={[
              {
                label: "Last sync",
                value: overview?.imports.lastSync ? formatDate(overview.imports.lastSync) : "Not synced",
              },
              { label: "Records tracked", value: formatNumber(overview?.imports.processedItems) },
              { label: "Sync failures", value: formatNumber(overview?.imports.failed) },
            ]}
            loading={overviewLoading && !overview}
            actionLabel="Sync now"
            onAction={handleSyncImports}
            actionDisabled={!canRunImports}
            actionLoading={syncingImports}
            roleNotice={!canRunImports ? "Admin access required" : undefined}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              title={kpi.title}
              value={kpi.value}
              deltaPct={kpi.deltaPct}
              series={kpi.series}
            />
          ))}
        </div>

        {safetyKpis && (
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              key="activePermits"
              title="Active Permits"
              value={safetyKpis.activeCount}
              deltaPct={0}
              series={[]}
            />
            <KpiCard
              key="overdueApprovals"
              title="Overdue Approvals"
              value={safetyKpis.overdueApprovals}
              deltaPct={0}
              series={[]}
            />
            <KpiCard
              key="incidents30"
              title="Incidents (30d)"
              value={safetyKpis.incidentsLast30}
              deltaPct={0}
              series={[]}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TrendChart
            loading={!summary}
            title="PM Compliance Trend"
            data={summary ? trends?.pmCompliance : []}
            color="#3b82f6"
          />
          <TrendChart
            loading={!summary}
            title="WO Backlog Trend"
            data={summary ? trends?.woBacklog : []}
            color="#ef4444"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 p-4 text-white">
            <h2 className="text-lg font-semibold">Recent Work Orders</h2>
            <Link to="/dashboard/work-orders" className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-white/10">
            {workOrdersLoading && recent.length === 0 ? (
              <SkeletonRows rows={5} />
            ) : recent.length === 0 ? (
              <div className="p-6 text-sm text-white/70">No recent work orders.</div>
            ) : (
              recent.map((wo) => <RecentWOItem key={wo.id} wo={wo} />)
            )}
          </div>
        </div>
      </div>

      <div className="w-80">
        <RecentActivity
          logs={logs}
          loading={loadingLogs}
          error={logsError}
          onRefresh={refreshLogs}
        />
      </div>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <p className="text-sm text-white/60 mb-2">{title}</p>
      {loading ? (
        <div className="h-16 w-full animate-pulse rounded bg-white/10" />
      ) : data && data.length > 0 ? (
        <div className="h-16">
          <Sparkline data={data} color={color} className="h-full w-full" />
        </div>
      ) : (
        <p className="text-sm text-white/60">No data</p>
      )}
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  metrics,
  onAction,
  actionLabel,
  actionDisabled,
  actionLoading,
  loading,
  roleNotice,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  metrics: { label: string; value: string }[];
  onAction: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  actionLoading?: boolean;
  loading?: boolean;
  roleNotice?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex h-full flex-col bg-slate-900/60">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/60">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {metrics.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs text-white/70">
            <span>{label}</span>
            {loading ? (
              <span className="h-4 w-12 animate-pulse rounded bg-white/10" />
            ) : (
              <span className="font-semibold text-white">{value}</span>
            )}
          </div>
        ))}
      </div>

      {children ? (
        <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/70">{children}</div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        {roleNotice ? (
          <span className="text-xs text-white/50">{roleNotice}</span>
        ) : (
          <span />
        )}
        <Button
          variant="default"
          size="sm"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
          className="inline-flex items-center gap-2"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function WorkOrderPreviewList({
  workOrders,
  loading,
}: {
  workOrders: RecentWorkOrder[];
  loading: boolean;
}) {
  if (loading && workOrders.length === 0) {
    return <SkeletonRows rows={3} />;
  }
  if (!workOrders.length) {
    return <p className="text-xs text-white/60">No recent work orders.</p>;
  }
  return (
    <ul className="space-y-2 text-xs text-white/70">
      {workOrders.map((wo) => (
        <li key={wo.id} className="flex items-center justify-between gap-2">
          <span className="truncate text-white">{wo.title}</span>
          <span>{wo.status}</span>
        </li>
      ))}
    </ul>
  );
}

function PermitList({
  permits,
  loading,
  error,
}: {
  permits: PermitPreview[];
  loading: boolean;
  error?: string;
}) {
  if (error) {
    return <p className="text-xs text-error-200">{error}</p>;
  }
  if (loading && permits.length === 0) {
    return <SkeletonRows rows={3} />;
  }
  if (!permits.length) {
    return <p className="text-xs text-white/60">No pending permits.</p>;
  }
  return (
    <ul className="space-y-2 text-xs text-white/70">
      {permits.slice(0, 3).map((permit) => (
        <li key={permit.id} className="flex items-center justify-between gap-2">
          <span className="truncate text-white">{permit.number}</span>
          <span>{permit.status}</span>
        </li>
      ))}
    </ul>
  );
}

function RecentWOItem({ wo }: { wo: RecentWorkOrder }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 text-white">
      <div className="min-w-0">
        <p className="font-medium truncate">{wo.title}</p>
        <p className="mt-1 text-xs text-white/60">
          {wo.assetName ? `${wo.assetName} • ` : ""}
          <Badge tone={priorityTone(wo.priority)}>{wo.priority}</Badge>
          <span className="mx-1">•</span>
          <Badge>{wo.status}</Badge>
        </p>
      </div>
      <p className="text-xs text-white/60 whitespace-nowrap">
        {formatTime(wo.updatedAt)}
      </p>
    </div>
  );
}

function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-4 w-full animate-pulse rounded bg-white/10" />
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
      ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/40"
      : tone === "amber"
      ? "bg-amber-500/20 text-amber-100 border-amber-400/40"
      : tone === "red"
      ? "bg-red-500/20 text-red-100 border-red-400/40"
      : "bg-white/10 text-white border-white/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${palette}`}>
      {children}
    </span>
  );
}

function priorityTone(priority: RecentWorkOrder["priority"]): "default" | "green" | "amber" | "red" {
  switch (priority) {
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

function mapWorkOrderSummary(wo: DashboardWorkOrderResponse): RecentWorkOrder {
  return {
    id: wo.id,
    title: wo.title,
    assetName: wo.assetName ?? undefined,
    priority: mapPriority(wo.priority),
    status: mapStatus(wo.status),
    updatedAt: wo.updatedAt ?? new Date().toISOString(),
  };
}

function mapPriority(priority: string): RecentWorkOrder["priority"] {
  switch (priority?.toLowerCase()) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "critical":
      return "Critical";
    default:
      return "Medium";
  }
}

function mapStatus(status: string): RecentWorkOrder["status"] {
  switch (status?.toLowerCase()) {
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Open";
  }
}

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatStatus(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Clock, ClipboardList, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import StatusLegend from "@/components/common/StatusLegend";

type RecentWorkOrder = {
  id: string;
  title: string;
  status: string;
  priority?: "low" | "medium" | "high" | "critical" | undefined;
  createdAt?: string | Date | undefined;
  updatedAt?: string | Date | undefined;
  completedAt?: string | Date | undefined;
  dueDate?: string | Date | null | undefined;
  assetName?: string | undefined;
};

type DashboardSummary = {
  totalWO: number;
  completedWO: number;
  activePM: number;
  completionRate: number;
  overdue: number;
  critical: number;
  avgResponse: number;
  slaHitRate: number;
};

type DashboardOverview = {
  livePulse?: {
    criticalAlerts?: number;
    maintenanceDue?: number;
    complianceScore?: number;
  };
  commandCenter?: {
    overdueWorkOrders?: number;
    activeWorkOrders?: number;
  };
  analytics?: {
    completionRate?: number;
  };
  workOrders?: {
    onTimeCompletionRate?: number;
  };
};

const asNumber = (value: unknown): number =>
  typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : 0;
const formatNumber = (n: number | undefined) => (typeof n === "number" ? n.toLocaleString() : "0");
const formatPercent = (n: number | undefined) => (typeof n === "number" ? `${n.toFixed(0)}%` : "0%");
const formatDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString() : "--");
const formatTime = (d?: string | Date) => (d ? new Date(d).toLocaleTimeString() : "--");
const formatStatus = (s?: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const mapWorkOrderSummary = (rows: any[] = []): RecentWorkOrder[] =>
  rows.map((r) => {
    const createdAt = toIsoString(r.createdAt ?? r.created ?? r.updatedAt ?? Date.now());
    const updatedAt = toIsoString(r.updatedAt);
    const completedAt = toIsoString(r.completedAt ?? (r.status === "completed" ? r.updatedAt : undefined));
    const dueDate = toIsoString(r.dueDate);

    return {
      id: String(r.id ?? r._id ?? crypto.randomUUID()),
      title: r.title ?? r.name ?? "Untitled",
      status: r.status ?? "open",
      priority: r.priority ?? "medium",
      createdAt,
      updatedAt,
      completedAt,
      dueDate: dueDate ?? null,
      assetName: r.assetName ?? r.asset?.name ?? "",
    } satisfies RecentWorkOrder;
  });

const PermitList = () => null;

const unwrapApiData = <T,>(payload: unknown): T | undefined => {
  if (payload && typeof payload === "object" && payload !== null) {
    if ("data" in payload) {
      return (payload as { data?: T }).data;
    }
  }
  return payload as T;
};

const extractItemsArray = (payload: unknown): any[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && payload !== null) {
    const items = (payload as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items;
    }
  }

  return [];
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const normalizeSummary = (payload: unknown): DashboardSummary | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  const totalWO = toOptionalNumber(raw.totalWO);
  const completedWO = toOptionalNumber(raw.completedWO);
  const backlog = toOptionalNumber(raw.woBacklog);
  const explicitCompletionRate = toOptionalNumber(raw.completionRate);

  const pmComplianceRaw = toOptionalNumber(raw.pmCompliance);
  const pmComplianceRatio =
    pmComplianceRaw !== undefined
      ? pmComplianceRaw > 1
        ? pmComplianceRaw / 100
        : pmComplianceRaw
      : explicitCompletionRate !== undefined
        ? explicitCompletionRate / 100
        : undefined;

  const completionRate =
    explicitCompletionRate !== undefined
      ? explicitCompletionRate
      : pmComplianceRatio !== undefined
        ? pmComplianceRatio * 100
        : undefined;

  const derivedTotal =
    totalWO !== undefined
      ? totalWO
      : backlog !== undefined && pmComplianceRatio !== undefined && pmComplianceRatio < 1
        ? Math.round(backlog / (1 - pmComplianceRatio))
        : backlog;

  const derivedCompleted =
    completedWO !== undefined
      ? completedWO
      : derivedTotal !== undefined && completionRate !== undefined
        ? Math.round((completionRate / 100) * derivedTotal)
        : undefined;

  const summary: DashboardSummary = {
    totalWO: derivedTotal ?? 0,
    completedWO: derivedCompleted ?? 0,
    activePM:
      toOptionalNumber(raw.activePM) ??
      (pmComplianceRatio !== undefined ? Math.round(pmComplianceRatio * 100) : 0),
    completionRate: completionRate ?? 0,
    overdue: toOptionalNumber(raw.overdue) ?? backlog ?? 0,
    critical: toOptionalNumber(raw.critical) ?? 0,
    avgResponse:
      toOptionalNumber(raw.avgResponse) ?? toOptionalNumber(raw.downtimeThisMonth) ?? 0,
    slaHitRate:
      toOptionalNumber(raw.slaHitRate) ?? toOptionalNumber(raw.wrenchTimePct) ?? 0,
  };

  const hasMeaningfulValue = Object.values(summary).some((value) => value !== 0);
  return hasMeaningfulValue ? summary : null;
};

const WorkOrderPreviewList = ({ items }: { items: RecentWorkOrder[] }) => (
  <ul className="divide-y divide-zinc-800/80">
    {items.map((item) => (
      <li key={item.id} className="flex items-start justify-between gap-3 py-3">
        <div>
          <p className="font-medium text-zinc-100">{item.title}</p>
          <p className="text-xs text-zinc-400">
            {formatStatus(item.status)} · {(item.priority ?? "medium").toUpperCase()}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(item.createdAt)} at {formatTime(item.createdAt)}
          </p>
        </div>
        {item.assetName ? (
          <span className="px-2 py-1 text-xs rounded bg-zinc-800 text-zinc-300">{item.assetName}</span>
        ) : null}
      </li>
    ))}
  </ul>
);

const TrendChart = ({
  data,
}: {
  data: { name: string; created: number; completed: number }[];
}) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="name" stroke="#a1a1aa" tickLine={false} axisLine={false} />
        <YAxis stroke="#a1a1aa" tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a" }}
          labelStyle={{ color: "#e4e4e7" }}
        />
        <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const SkeletonRows = () => (
  <div className="text-sm animate-pulse text-zinc-400">Loading…</div>
);

const aggregateWorkOrderCounts = (payload: unknown) => {
  const rows = extractItemsArray(payload) as Array<{ _id?: unknown; count?: unknown }>;

  return rows.reduce(
    (acc, row) => {
      const status = typeof row._id === "string" ? row._id : String(row._id ?? "");
      const count = typeof row.count === "number" ? row.count : Number(row.count ?? 0);
      if (!Number.isFinite(count)) {
        return acc;
      }
      acc.total += count;
      if (status === "completed") {
        acc.completed += count;
      } else if (status !== "cancelled") {
        acc.active += count;
      }
      return acc;
    },
    { total: 0, completed: 0, active: 0 },
  );
};

const countOverdueFromList = (orders: RecentWorkOrder[]) => {
  const now = Date.now();
  return orders.reduce((total, order) => {
    if (!order.dueDate) return total;
    const due = new Date(order.dueDate).getTime();
    if (Number.isNaN(due)) return total;
    if (due < now && order.status !== "completed" && order.status !== "cancelled") {
      return total + 1;
    }
    return total;
  }, 0);
};

const computeTrendData = (orders: RecentWorkOrder[], days = 7) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

  const createdCounts = new Map<string, number>();
  const completedCounts = new Map<string, number>();

  const increment = (map: Map<string, number>, key: string | undefined) => {
    if (!key) return;
    const date = new Date(key);
    if (Number.isNaN(date.getTime())) return;
    const iso = date.toISOString().slice(0, 10);
    map.set(iso, (map.get(iso) ?? 0) + 1);
  };

  orders.forEach((order) => {
    increment(createdCounts, typeof order.createdAt === "string" ? order.createdAt : order.createdAt?.toString());
    if (order.status === "completed") {
      const completedSource =
        typeof order.completedAt === "string"
          ? order.completedAt
          : order.completedAt?.toString() ??
          (typeof order.updatedAt === "string" ? order.updatedAt : order.updatedAt?.toString());
      increment(completedCounts, completedSource);
    }
  });

  const results: { name: string; created: number; completed: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    results.push({
      name: formatter.format(date),
      created: createdCounts.get(iso) ?? 0,
      completed: completedCounts.get(iso) ?? 0,
    });
  }

  return results;
};

function ModuleCard({
  icon: Icon,
  title,
  description,
  metrics,
  children,
}: {
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  metrics?: { label: string; value: string | number }[];
  children?: ReactNode;
}) {
  return (
    <div className="p-4 border rounded-xl border-zinc-800/60 bg-zinc-900/40">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className="w-5 h-5 text-zinc-300" /> : null}
        <div className="font-medium text-zinc-100">{title}</div>
      </div>
      {description ? <p className="mt-1 text-xs text-zinc-400">{description}</p> : null}
      {metrics?.length ? (
        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          {metrics.map((m, i) => (
            <div key={i} className="p-2 rounded-lg bg-zinc-800/40">
              <div className="text-zinc-400">{m.label}</div>
              <div className="font-semibold text-zinc-100">{m.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [trendData, setTrendData] = useState<{ name: string; created: number; completed: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startRange = new Date(now);
        startRange.setDate(now.getDate() - 30);
        const formatDateParam = (date: Date) => date.toISOString().slice(0, 10);

        const [summaryResponse, workOrderSummaryResponse, overviewResponse, workOrdersResponse] =
          await Promise.all([
            api.get("/summary"),
            api.get("/summary/workorders"),
            api.get("/dashboard/overview"),
            api.get("/workorders/search", {
              params: {
                startDate: formatDateParam(startRange),
                endDate: formatDateParam(now),
              },
            }),
          ]);

        if (cancelled) return;

        const summaryData = unwrapApiData<unknown>(summaryResponse.data);
        const normalizedSummary = normalizeSummary(summaryData);

        const overviewData = unwrapApiData<unknown>(overviewResponse.data) as DashboardOverview | undefined;
        const workOrderCountsPayload = unwrapApiData<unknown>(workOrderSummaryResponse.data);
        const workOrderTotals = aggregateWorkOrderCounts(workOrderCountsPayload);

        const workOrdersPayload = unwrapApiData<unknown>(workOrdersResponse.data);
        const rows = extractItemsArray(workOrdersPayload);
        const mappedWorkOrders = mapWorkOrderSummary(rows);
        mappedWorkOrders.sort((a, b) => {
          const aTime = new Date(a.createdAt ?? a.updatedAt ?? Date.now()).getTime();
          const bTime = new Date(b.createdAt ?? b.updatedAt ?? Date.now()).getTime();
          return bTime - aTime;
        });
        if (cancelled) return;
        setRecentWorkOrders(mappedWorkOrders.slice(0, 5));
        setTrendData(computeTrendData(mappedWorkOrders));

        const derivedOverdue = countOverdueFromList(mappedWorkOrders);

        const combinedSummary: DashboardSummary = {
          totalWO: workOrderTotals.total,
          completedWO: workOrderTotals.completed,
          activePM: overviewData?.livePulse?.maintenanceDue ?? 0,
          completionRate:
            typeof overviewData?.analytics?.completionRate === "number"
              ? overviewData.analytics.completionRate
              : normalizedSummary?.completionRate ?? 0,
          overdue:
            overviewData?.commandCenter?.overdueWorkOrders ??
            (derivedOverdue > 0 ? derivedOverdue : workOrderTotals.active),
          critical: overviewData?.livePulse?.criticalAlerts ?? 0,
          avgResponse: normalizedSummary?.avgResponse ?? 0,
          slaHitRate:
            typeof overviewData?.workOrders?.onTimeCompletionRate === "number"
              ? overviewData.workOrders.onTimeCompletionRate
              : normalizedSummary?.slaHitRate ?? 0,
        };

        setSummary(combinedSummary);
        setError(null);
      } catch (error) {
        console.error(error);
        const message =
          axios.isAxiosError(error) && error.response && [401, 403].includes(error.response.status ?? 0)
            ? "You must be signed in to view the dashboard."
            : "Failed to load dashboard data";
        if (cancelled) return;
        setError(message);
        toast.error(message);
        setSummary(null);
        setRecentWorkOrders([]);
        setTrendData([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const summaryMetrics = summary ?? {
    totalWO: 0,
    completedWO: 0,
    activePM: 0,
    completionRate: 0,
    overdue: 0,
    critical: 0,
    avgResponse: 0,
    slaHitRate: 0,
  };

  const metricCards = useMemo(
    () => [
      {
        icon: ClipboardList,
        title: "Work Orders",
        description: "Current load across your teams",
        metrics: [
          { label: "Total", value: formatNumber(summaryMetrics.totalWO) },
          { label: "Completed", value: formatNumber(summaryMetrics.completedWO) },
        ],
      },
      {
        icon: Wrench,
        title: "Active PMs",
        description: "Preventive maintenance in progress",
        metrics: [
          { label: "Active", value: formatNumber(summaryMetrics.activePM) },
          { label: "Completion", value: formatPercent(summaryMetrics.completionRate) },
        ],
      },
      {
        icon: AlertTriangle,
        title: "Overdue",
        description: "Items requiring attention",
        metrics: [
          { label: "Overdue", value: formatNumber(summaryMetrics.overdue) },
          { label: "Critical", value: formatNumber(summaryMetrics.critical) },
        ],
      },
      {
        icon: Clock,
        title: "Response Time",
        description: "Average response across last 30 days",
        metrics: [
          {
            label: "Average",
            value:
              typeof summaryMetrics.avgResponse === "number"
                ? `${summaryMetrics.avgResponse.toFixed(1)} hrs`
                : `${asNumber(summaryMetrics.avgResponse).toFixed(1)} hrs`,
          },
          {
            label: "SLA Hit",
            value: formatPercent(summaryMetrics.slaHitRate),
          },
        ],
      },
    ],
    [summaryMetrics],
  );

  const hasTrendData = useMemo(
    () => trendData.some((point) => point.created > 0 || point.completed > 0),
    [trendData],
  );

  return (
    <>
      <div className="min-h-screen p-6 space-y-8 bg-slate-950 text-zinc-100">
        {error ? (
          <div className="p-3 text-sm text-red-200 border rounded-lg border-red-500/40 bg-red-950/40">
            {error}
          </div>
        ) : null}
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
          <p className="text-sm text-zinc-400">
            Monitor maintenance operations, recent activity, and outstanding work orders at a glance.
          </p>
        </header>
        <StatusLegend />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <ModuleCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              description={card.description}
              metrics={card.metrics}
            />
          ))}
        </div>
        {!loading && !summary ? (
          <p className="text-sm text-zinc-500">No summary data available.</p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <ModuleCard
            icon={ClipboardList}
            title="Work Order Trends"
            description="Daily created versus completed work orders"
          >
            {loading ? (
              <SkeletonRows />
            ) : hasTrendData ? (
              <TrendChart data={trendData} />
            ) : (
              <p className="text-sm text-zinc-400">No trend data available.</p>
            )}
          </ModuleCard>

          <ModuleCard
            icon={Wrench}
            title="Recent Work Orders"
            description="Latest work orders awaiting action"
          >
            {loading ? (
              <SkeletonRows />
            ) : recentWorkOrders.length ? (
              <WorkOrderPreviewList items={recentWorkOrders} />
            ) : (
              <p className="text-sm text-zinc-400">No recent work orders found.</p>
            )}
          </ModuleCard>

          <ModuleCard
            icon={AlertTriangle}
            title="Permits Snapshot"
            description="Upcoming permit tasks and expirations"
          >
            <PermitList />
          </ModuleCard>
        </div>
      </div>
    </>
  );
}

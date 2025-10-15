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

type RecentWorkOrder = {
  id: string;
  title: string;
  status: string;
  priority?: "low" | "medium" | "high" | "critical";
  createdAt?: string | Date;
  assetName?: string;
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

const asNumber = (value: unknown): number =>
  typeof value === "number" ? value : Number.isFinite(Number(value)) ? Number(value) : 0;
const formatNumber = (n: number | undefined) => (typeof n === "number" ? n.toLocaleString() : "0");
const formatPercent = (n: number | undefined) => (typeof n === "number" ? `${n.toFixed(0)}%` : "0%");
const formatDate = (d?: string | Date) => (d ? new Date(d).toLocaleDateString() : "--");
const formatTime = (d?: string | Date) => (d ? new Date(d).toLocaleTimeString() : "--");
const formatStatus = (s?: string) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";

const mapWorkOrderSummary = (rows: any[] = []): RecentWorkOrder[] =>
  rows.map((r) => ({
    id: String(r.id ?? r._id ?? crypto.randomUUID()),
    title: r.title ?? r.name ?? "Untitled",
    status: r.status ?? "open",
    priority: r.priority ?? "medium",
    createdAt: r.createdAt ?? r.created ?? Date.now(),
    assetName: r.assetName ?? r.asset?.name ?? "",
  }));

const PermitList = () => null;

const FALLBACK_SUMMARY: DashboardSummary = {
  totalWO: 128,
  completedWO: 94,
  activePM: 18,
  completionRate: 86,
  overdue: 7,
  critical: 2,
  avgResponse: 3.4,
  slaHitRate: 92,
};

const FALLBACK_WORK_ORDERS: RecentWorkOrder[] = [
  {
    id: "demo-1",
    title: "Inspect packaging line sensors",
    status: "open",
    priority: "high",
    createdAt: new Date().toISOString(),
    assetName: "Packaging Line 3",
  },
  {
    id: "demo-2",
    title: "Replace HVAC filter in office wing",
    status: "in_progress",
    priority: "medium",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    assetName: "AHU-07",
  },
  {
    id: "demo-3",
    title: "Lubricate conveyor bearings",
    status: "scheduled",
    priority: "low",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    assetName: "Conveyor B",
  },
];

const FALLBACK_TREND_DATA = [
  { name: "Mon", created: 14, completed: 11 },
  { name: "Tue", created: 18, completed: 15 },
  { name: "Wed", created: 9, completed: 8 },
  { name: "Thu", created: 12, completed: 10 },
  { name: "Fri", created: 21, completed: 18 },
  { name: "Sat", created: 6, completed: 5 },
  { name: "Sun", created: 11, completed: 9 },
];

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
          <span className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300">{item.assetName}</span>
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
  <div className="animate-pulse text-sm text-zinc-400">Loading…</div>
);

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
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className="h-5 w-5 text-zinc-300" /> : null}
        <div className="font-medium text-zinc-100">{title}</div>
      </div>
      {description ? <p className="mt-1 text-xs text-zinc-400">{description}</p> : null}
      {metrics?.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {metrics.map((m, i) => (
            <div key={i} className="rounded-lg bg-zinc-800/40 p-2">
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
  const [summary, setSummary] = useState<DashboardSummary>(FALLBACK_SUMMARY);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>(FALLBACK_WORK_ORDERS);
  const [trendData, setTrendData] = useState<{ name: string; created: number; completed: number }[]>(
    FALLBACK_TREND_DATA,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [summaryResponse, workOrdersResponse] = await Promise.all([
          api.get("/summary"),
          api.get("/workorders", { params: { limit: 5, sort: "-createdAt" } }),
        ]);

        const summaryData = unwrapApiData<unknown>(summaryResponse.data);
        const normalizedSummary = normalizeSummary(summaryData);
        setSummary(normalizedSummary ?? FALLBACK_SUMMARY);

        const workOrdersPayload = unwrapApiData<unknown>(workOrdersResponse.data);
        const rows = extractItemsArray(workOrdersPayload);
        const mappedWorkOrders = mapWorkOrderSummary(rows);
        setRecentWorkOrders(mappedWorkOrders.length ? mappedWorkOrders : FALLBACK_WORK_ORDERS);
        setTrendData(FALLBACK_TREND_DATA);
      } catch (error) {
        console.error(error);
        if (
          axios.isAxiosError(error) &&
          error.response &&
          [401, 403].includes(error.response.status ?? 0)
        ) {
          toast("Showing demo dashboard data. Sign in for live metrics.");
          setSummary(FALLBACK_SUMMARY);
          setRecentWorkOrders(FALLBACK_WORK_ORDERS);
          setTrendData(FALLBACK_TREND_DATA);
        } else {
          toast.error("Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const metricCards = useMemo(
    () => [
      {
        icon: ClipboardList,
        title: "Work Orders",
        description: "Current load across your teams",
        metrics: [
          { label: "Total", value: formatNumber(summary.totalWO) },
          { label: "Completed", value: formatNumber(summary.completedWO) },
        ],
      },
      {
        icon: Wrench,
        title: "Active PMs",
        description: "Preventive maintenance in progress",
        metrics: [
          { label: "Active", value: formatNumber(summary.activePM) },
          { label: "Completion", value: formatPercent(summary.completionRate) },
        ],
      },
      {
        icon: AlertTriangle,
        title: "Overdue",
        description: "Items requiring attention",
        metrics: [
          { label: "Overdue", value: formatNumber(summary.overdue) },
          { label: "Critical", value: formatNumber(summary.critical) },
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
              typeof summary.avgResponse === "number"
                ? `${summary.avgResponse.toFixed(1)} hrs`
                : `${asNumber(summary.avgResponse).toFixed(1)} hrs`,
          },
          {
            label: "SLA Hit",
            value: formatPercent(summary.slaHitRate),
          },
        ],
      },
    ],
    [summary],
  );

  return (
    <>
      <div className="min-h-screen space-y-8 bg-slate-950 p-6 text-zinc-100">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
          <p className="text-sm text-zinc-400">
            Monitor maintenance operations, recent activity, and outstanding work orders at a glance.
          </p>
        </header>

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

        <div className="grid gap-4 lg:grid-cols-3">
          <ModuleCard
            icon={ClipboardList}
            title="Work Order Trends"
            description="Daily created versus completed work orders"
          >
            {loading ? <SkeletonRows /> : <TrendChart data={trendData} />}
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

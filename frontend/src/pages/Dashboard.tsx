import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  const [summary, setSummary] = useState<Record<string, number | string> | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<RecentWorkOrder[]>([]);
  const [trendData, setTrendData] = useState<{ name: string; created: number; completed: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [summaryResponse, workOrdersResponse] = await Promise.all([
          api.get("/summary"),
          api.get("/workorders", { params: { limit: 5, sort: "-createdAt" } }),
        ]);

        const summaryData = unwrapApiData<Record<string, number | string>>(summaryResponse.data);
        setSummary(summaryData ?? null);

        const workOrdersPayload = unwrapApiData<unknown>(workOrdersResponse.data);
        const rows = extractItemsArray(workOrdersPayload);
        setRecentWorkOrders(mapWorkOrderSummary(rows));
        setTrendData([
          { name: "Mon", created: 14, completed: 11 },
          { name: "Tue", created: 18, completed: 15 },
          { name: "Wed", created: 9, completed: 8 },
          { name: "Thu", created: 12, completed: 10 },
          { name: "Fri", created: 21, completed: 18 },
          { name: "Sat", created: 6, completed: 5 },
          { name: "Sun", created: 11, completed: 9 },
        ]);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load dashboard data");
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
          { label: "Total", value: formatNumber(asNumber(summary?.totalWO)) },
          { label: "Completed", value: formatNumber(asNumber(summary?.completedWO)) },
        ],
      },
      {
        icon: Wrench,
        title: "Active PMs",
        description: "Preventive maintenance in progress",
        metrics: [
          { label: "Active", value: formatNumber(asNumber(summary?.activePM)) },
          { label: "Completion", value: formatPercent(asNumber(summary?.completionRate)) },
        ],
      },
      {
        icon: AlertTriangle,
        title: "Overdue",
        description: "Items requiring attention",
        metrics: [
          { label: "Overdue", value: formatNumber(asNumber(summary?.overdue)) },
          { label: "Critical", value: formatNumber(asNumber(summary?.critical)) },
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
              typeof summary?.avgResponse === "number"
                ? `${summary.avgResponse.toFixed(1)} hrs`
                : `${asNumber(summary?.avgResponse).toFixed(1)} hrs`,
          },
          {
            label: "SLA Hit",
            value: formatPercent(asNumber(summary?.slaHitRate)),
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

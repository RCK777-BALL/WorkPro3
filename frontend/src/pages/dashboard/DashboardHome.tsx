import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Timer,
  Boxes,
  Activity,
  ChevronRight,
  Plus,
} from "lucide-react";

/** ---- Types ---- */
type Summary = {
  openWorkOrders: number;
  pmDueThisWeek: number;
  assets: number;
  uptime: number; // 0-100
};

type RecentWorkOrder = {
  id: string;
  title: string;
  line?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "On Hold" | "Completed";
  updatedAt: string; // ISO
};

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<RecentWorkOrder[]>([]);

  useEffect(() => {
    let cancelled = false;

    // TODO: replace mock with real endpoint (e.g., /api/summary and /api/workorders?limit=5)
    const fetchData = async () => {
      try {
        // Example (uncomment and adjust to your API):
        // const [sumRes, woRes] = await Promise.all([
        //   fetch("/api/summary"),
        //   fetch("/api/workorders?limit=5&sort=-updatedAt"),
        // ]);
        // const sumJson: Summary = await sumRes.json();
        // const woJson: RecentWorkOrder[] = await woRes.json();

        // Mock data for now:
        const sumJson: Summary = {
          openWorkOrders: 18,
          pmDueThisWeek: 7,
          assets: 256,
          uptime: 98.6,
        };
        const woJson: RecentWorkOrder[] = [
          {
            id: "WO-1045",
            title: "Conveyor #3 belt tracking",
            line: "Line A",
            priority: "High",
            status: "In Progress",
            updatedAt: new Date().toISOString(),
          },
          {
            id: "WO-1044",
            title: "Robot cell light curtain fault",
            line: "Line B",
            priority: "Critical",
            status: "Open",
            updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            id: "WO-1043",
            title: "Press #2 lube check",
            line: "Stamping",
            priority: "Medium",
            status: "On Hold",
            updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          },
          {
            id: "WO-1042",
            title: "Replace proximity sensor at Station 5",
            line: "Assembly",
            priority: "Low",
            status: "Completed",
            updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          },
          {
            id: "WO-1041",
            title: "Calibrate torque tools",
            line: "Final",
            priority: "Medium",
            status: "Open",
            updatedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          },
        ];

        if (!cancelled) {
          setSummary(sumJson);
          setRecent(woJson);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
        // Optionally show a toast or error UI
        // console.error(e);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          title="Open Work Orders"
          value={summary?.openWorkOrders}
          icon={<ClipboardList className="h-5 w-5" />}
          footer={<Link className="inline-flex items-center gap-1 text-sm" to="/dashboard/work-orders">View all <ChevronRight className="h-4 w-4" /></Link>}
        />
        <StatCard
          loading={loading}
          title="PM Due (7d)"
          value={summary?.pmDueThisWeek}
          icon={<Timer className="h-5 w-5" />}
          footer={<Link className="inline-flex items-center gap-1 text-sm" to="/dashboard/pm">Open PM schedule <ChevronRight className="h-4 w-4" /></Link>}
        />
        <StatCard
          loading={loading}
          title="Total Assets"
          value={summary?.assets}
          icon={<Boxes className="h-5 w-5" />}
          footer={<Link className="inline-flex items-center gap-1 text-sm" to="/dashboard/assets">Manage assets <ChevronRight className="h-4 w-4" /></Link>}
        />
        <StatCard
          loading={loading}
          title="Uptime"
          value={summary ? `${summary.uptime.toFixed(1)}%` : undefined}
          icon={<Activity className="h-5 w-5" />}
          footer={<Link className="inline-flex items-center gap-1 text-sm" to="/dashboard/analytics">See analytics <ChevronRight className="h-4 w-4" /></Link>}
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

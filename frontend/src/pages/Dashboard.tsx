import type { ComponentType, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  Activity as ActivityLucide,
  AlertTriangle as AlertTriangleLucide,
  ArrowUpRight,
  CalendarClock as CalendarClockLucide,
  CheckCircle2 as CheckCircle2Lucide,
  ClipboardList as ClipboardListLucide,
  FileDown,
  GaugeCircle as GaugeCircleLucide,
  ShieldCheck as ShieldCheckLucide,
  Timer as TimerLucide,
  Wrench as WrenchLucide,
} from "lucide-react";
import clsx from "clsx";

import http from "@/lib/http";
import Sparkline from "@/components/charts/Sparkline";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@common/Button";
import AlertBanner from "@/components/layout/AlertBanner";
import { DashboardAnalyticsPanel } from "@/features/dashboards";
import { HelpCenterViewer } from "@/features/help-center";
import { OnboardingWizard } from "@/features/onboarding";
import { safeLocalStorage } from "@/utils/safeLocalStorage";
import { usePmCompletionAnalytics } from "@/hooks/usePmAnalytics";
import { Card, SectionHeader } from "@/components/ui";
import type { PmCompletionPoint } from "@backend-shared/pmAnalytics";

type SummaryResponse = {
  openWorkOrders: number;
  overdueWorkOrders: number;
  completedWorkOrders: number;
  pmDueNext7Days: number;
  permitsOpen: number;
  complianceScore: number;
  assetAvailability: number;
  assetAvailabilityCritical: number;
  activePmTasks: number;
  pmCompliance: number;
  woBacklog: number;
  downtimeThisMonth: number;
  costMTD: number;
  cmVsPmRatio: number;
  wrenchTimePct: number;
  mttr: number;
  slaCompliance: number;
};

type SummaryTrends = {
  pmCompliance: number[];
  woBacklog: number[];
  downtimeThisMonth: number[];
  costMTD: number[];
  cmVsPmRatio: number[];
  wrenchTimePct: number[];
  mttr: number[];
  slaCompliance: number[];
};

type LivePulseMetrics = {
  criticalAlerts: number;
  maintenanceDue: number;
  complianceScore: number;
  techniciansCheckedIn: number;
  permitsRequireApproval: number;
  updatedAt?: string;
};

type RecentActivityItem = {
  id: string;
  type: string;
  action: string;
  ref: string;
  user: string;
  time: string;
  link: string | null;
};

const RECENT_ACTIVITY_FALLBACK: RecentActivityItem[] = [
  {
    id: "fallback-wo-101",
    type: "work-order",
    action: "Work order WO-101 assigned",
    ref: "WO-101",
    user: "System",
    time: new Date().toISOString(),
    link: "/work-orders",
  },
  {
    id: "fallback-pm-202",
    type: "pm-task",
    action: "Preventive task PM-202 completed",
    ref: "PM-202",
    user: "Auto Scheduler",
    time: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    link: "/pm/tasks",
  },
  {
    id: "fallback-inspection-303",
    type: "inspection",
    action: "Inspection report INS-303 submitted",
    ref: "INS-303",
    user: "Quality Bot",
    time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    link: "/analytics",
  },
];

type StatusSummaryItem = {
  label: string;
  color: string;
};

type FilterState = {
  department: string;
  line: string;
  status: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type LineOption = SelectOption & {
  departmentId?: string;
};

type IconComponent = ComponentType<{ className?: string }>;

const createIconAdapter = (Icon: LucideIcon): IconComponent => {
  const Adapter: IconComponent = ({ className }) => <Icon className={className} />;
  Adapter.displayName = `${Icon.displayName ?? "Lucide"}Adapter`;
  return Adapter;
};

const ActivityIcon = createIconAdapter(ActivityLucide);
const AlertTriangleIcon = createIconAdapter(AlertTriangleLucide);
const CalendarClockIcon = createIconAdapter(CalendarClockLucide);
const CheckCircle2Icon = createIconAdapter(CheckCircle2Lucide);
const ClipboardListIcon = createIconAdapter(ClipboardListLucide);
const GaugeCircleIcon = createIconAdapter(GaugeCircleLucide);
const ShieldCheckIcon = createIconAdapter(ShieldCheckLucide);
const TimerIcon = createIconAdapter(TimerLucide);
const WrenchIcon = createIconAdapter(WrenchLucide);

const STATUS_FILTERS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "active", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

const DEFAULT_FILTERS: FilterState = { department: "all", line: "all", status: "all" };

const FILTER_STORAGE_KEY = "operations-dashboard-filters";

const VALID_STATUS_VALUES = new Set(STATUS_FILTERS.map((option) => option.value));

const loadSavedFilters = (): FilterState => {
  if (typeof window === "undefined") {
    return DEFAULT_FILTERS;
  }

  try {
    const raw = safeLocalStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FILTERS;
    }
    const parsed = JSON.parse(raw) as Partial<FilterState> | null;
    const department = typeof parsed?.department === "string" ? parsed.department : "all";
    const line = typeof parsed?.line === "string" ? parsed.line : "all";
    const rawStatus = typeof parsed?.status === "string" ? parsed.status : "all";
    const status = VALID_STATUS_VALUES.has(rawStatus) ? rawStatus : "all";

    return { department, line, status };
  } catch (error) {
    return DEFAULT_FILTERS;
  }
};

const SUMMARY_FALLBACK: SummaryResponse = {
  openWorkOrders: 42,
  overdueWorkOrders: 11,
  completedWorkOrders: 128,
  pmDueNext7Days: 18,
  permitsOpen: 6,
  complianceScore: 96.4,
  assetAvailability: 92.1,
  assetAvailabilityCritical: 88.5,
  activePmTasks: 34,
  pmCompliance: 0.91,
  woBacklog: 57,
  downtimeThisMonth: 12,
  costMTD: 18450,
  cmVsPmRatio: 0.72,
  wrenchTimePct: 63.2,
  mttr: 2.6,
  slaCompliance: 96.7,
};

const SUMMARY_TRENDS_FALLBACK: SummaryTrends = {
  pmCompliance: [0.87, 0.89, 0.91, 0.92, 0.94, 0.95, 0.93, 0.96, 0.94, 0.965],
  woBacklog: [64, 62, 61, 59, 58, 57, 56, 58, 57, 55],
  downtimeThisMonth: [18, 16, 15, 14, 13, 12, 11, 11, 12, 12],
  costMTD: [21000, 20500, 20100, 19800, 19500, 19000, 18850, 18700, 18500, 18450],
  cmVsPmRatio: [0.82, 0.8, 0.79, 0.78, 0.76, 0.74, 0.73, 0.72, 0.71, 0.7],
  wrenchTimePct: [58, 59, 60, 61, 62, 63, 63.5, 63.1, 63.3, 63.2],
  mttr: [3.4, 3.1, 3.0, 2.8, 2.9, 2.7, 2.8, 2.6, 2.7, 2.6],
  slaCompliance: [94.1, 94.8, 95.2, 95.6, 95.9, 96.1, 96.3, 96.5, 96.6, 96.7],
};

const LIVE_PULSE_FALLBACK: LivePulseMetrics = {
  criticalAlerts: 2,
  maintenanceDue: 7,
  complianceScore: 95.1,
  techniciansCheckedIn: 18,
  permitsRequireApproval: 4,
  updatedAt: new Date().toISOString(),
};

const STATUS_LEGEND_FALLBACK: { statuses: StatusSummaryItem[]; updatedAt: string | null } = {
  statuses: [
    { label: "Open", color: "blue" },
    { label: "Active", color: "green" },
    { label: "Scheduled", color: "purple" },
    { label: "On hold", color: "yellow" },
    { label: "Completed", color: "green" },
    { label: "Closed", color: "slate" },
  ],
  updatedAt: null,
};

const DEPARTMENT_FALLBACK: SelectOption[] = [
  { value: "operations", label: "Operations" },
  { value: "maintenance", label: "Maintenance" },
  { value: "production", label: "Production" },
];

const LINE_FALLBACK: LineOption[] = [
  { value: "line-a", label: "Line A", departmentId: "operations" },
  { value: "line-b", label: "Line B", departmentId: "operations" },
  { value: "packaging", label: "Packaging", departmentId: "production" },
];

const formatErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data === "string") {
      return error.response.data;
    }
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;
    return message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const isNetworkError = (error: unknown) => axios.isAxiosError(error) && !error.response;

const mapStatusColorClass = (color: string) => {
  const normalized = color?.toLowerCase().trim();
  switch (normalized) {
    case "red":
      return "bg-red-500";
    case "yellow":
      return "bg-yellow-400";
    case "purple":
      return "bg-purple-500";
    case "green":
      return "bg-green-500";
    case "gray":
      return "bg-gray-400";
    case "slate":
      return "bg-slate-400";
    case "blue":
      return "bg-blue-500";
    case "orange":
      return "bg-orange-500";
    default:
      return "bg-slate-500";
  }
};

type AnimatedNumberProps = {
  value: number;
  decimals?: number;
};

function AnimatedNumber({ value, decimals = 0 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const start = performance.now();
    const initial = previousValueRef.current;
    const delta = value - initial;
    const duration = 600;
    let frame: number;

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const current = initial + delta * progress;
      setDisplayValue(current);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        previousValueRef.current = value;
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted =
    decimals > 0
      ? displayValue.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(displayValue).toLocaleString();

  return <>{formatted}</>;
}
type SummaryCardProps = {
  title: string;
  description: string;
  value: number;
  suffix?: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  trend?: number[];
  loading: boolean;
  href?: string;
  onViewAll?: () => void;
  decimals?: number;
};

function SummaryCard({
  title,
  description,
  value,
  suffix,
  icon: Icon,
  gradient,
  trend,
  loading,
  href,
  onViewAll,
  decimals = 0,
}: SummaryCardProps) {
  const cardClasses = clsx(
    "relative block overflow-hidden rounded-3xl border border-white/10 p-5 text-white shadow-xl transition",
    "hover:shadow-2xl hover:border-white/20",
    "bg-gradient-to-br",
    href
      ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      : undefined,
    gradient,
  );

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-full bg-white/30" />
          ) : (
            <div className="mt-3 flex items-baseline gap-1 text-3xl font-semibold">
              <AnimatedNumber value={value} decimals={decimals} />
              {suffix ? <span className="text-base font-medium">{suffix}</span> : null}
            </div>
          )}
          <p className="mt-2 text-sm text-white/80">{description}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className="mt-6 flex items-center justify-between">
        {trend && trend.length > 1 ? (
          <Sparkline
            data={trend}
            color="rgba(255,255,255,0.75)"
            className="h-12 w-32"
          />
        ) : (
          <div className="h-12 w-32 rounded-lg border border-white/10" />
        )}
        {href ? (
          <span className="inline-flex items-center text-sm font-semibold text-white/90 transition group-hover:translate-x-0.5">
            View all
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </span>
        ) : onViewAll ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={onViewAll}
          >
            View all
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} className={clsx(cardClasses, "group")} aria-label={`View details for ${title}`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}

type LivePulseProps = {
  metrics: LivePulseMetrics | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate?: (path: string) => void;
};

function LivePulseSection({ metrics, loading, error, onRefresh, onNavigate }: LivePulseProps) {
  const cards = [
    {
      key: "critical",
      title: "Critical alerts",
      value: metrics?.criticalAlerts ?? 0,
      tone: "border-red-400/50 bg-red-500/10",
      icon: AlertTriangleIcon,
      detail:
        metrics && metrics.criticalAlerts > 0
          ? "Escalations require immediate action"
          : "No active escalations",
      decimals: 0,
      link: "/workorders?priority=critical",
    },
    {
      key: "maintenance",
      title: "Maintenance due",
      value: metrics?.maintenanceDue ?? 0,
      tone: "border-amber-300/50 bg-amber-400/10",
      icon: CalendarClockIcon,
      detail:
        metrics && metrics.maintenanceDue > 0
          ? "Scheduled within the next 7 days"
          : "All maintenance on schedule",
      decimals: 0,
      link: "/workorders?status=assigned",
    },
    {
      key: "compliance",
      title: "Compliance score",
      value: metrics?.complianceScore ?? 0,
      suffix: "%",
      tone: "border-emerald-300/50 bg-emerald-400/10",
      icon: ShieldCheckIcon,
      detail:
        metrics && metrics.complianceScore >= 95
          ? "Excellent adherence this week"
          : "Monitor preventive compliance",
      decimals: 1,
      link: "/analytics?tab=pm",
    },
    {
      key: "technicians",
      title: "Technicians checked in",
      value: metrics?.techniciansCheckedIn ?? 0,
      tone: "border-sky-300/50 bg-sky-400/10",
      icon: WrenchIcon,
      detail: "Active technicians on assignments",
      decimals: 0,
      link: "/teams",
    },
    {
      key: "permits",
      title: "Permits pending approval",
      value: metrics?.permitsRequireApproval ?? 0,
      tone: "border-indigo-300/50 bg-indigo-400/10",
      icon: CheckCircle2Icon,
      detail: "Awaiting management review",
      decimals: 0,
      link: "/permits?status=pending",
    },
  ];

  const updatedLabel = metrics?.updatedAt
    ? formatDistanceToNow(new Date(metrics.updatedAt), { addSuffix: true })
    : "moments ago";

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, link?: string) => {
    if (!link || !onNavigate) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onNavigate(link);
    }
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-700 p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live pulse</h2>
          <p className="text-sm text-white/80">Real-time operational health indicators</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span>Updated {updatedLabel}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-300/60 bg-red-500/20 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ key, title, value, suffix, tone, icon: Icon, detail, decimals, link }) => {
            const isInteractive = Boolean(link && onNavigate);
            const navigateToLink = () => {
              if (link && onNavigate) {
                onNavigate(link);
              }
            };
            return (
              <div
                key={key}
                className={clsx(
                  "relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur transition",
                  tone,
                  loading && "animate-pulse",
                  isInteractive &&
                    "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-indigo-700/60",
                )}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                aria-label={isInteractive ? `${title} – view details` : undefined}
                onClick={isInteractive ? navigateToLink : undefined}
                onKeyDown={isInteractive ? (event) => handleKeyDown(event, link) : undefined}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/70">{title}</p>
                    <div className="mt-2 flex items-baseline gap-1 text-2xl font-semibold">
                      {loading ? "–" : <AnimatedNumber value={value} decimals={decimals ?? 0} />}
                      {suffix ? <span className="text-sm font-medium">{suffix}</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-white/75">{detail}</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                {isInteractive ? (
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-white/80">
                    View details
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
    </section>
  );
}
type RecentActivityProps = {
  items: RecentActivityItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNavigate: (link: string | null) => void;
};

function RecentActivitySection({ items, loading, error, onRefresh, onNavigate }: RecentActivityProps) {
  const resolveIcon = (type: string): IconComponent => {
    const normalized = type.toLowerCase();
    if (normalized.includes("work")) return ClipboardListIcon;
    if (normalized.includes("permit")) return CheckCircle2Icon;
    if (normalized.includes("pm")) return CalendarClockIcon;
    if (normalized.includes("compliance")) return ShieldCheckIcon;
    if (normalized.includes("asset")) return GaugeCircleIcon;
    return ActivityIcon;
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <p className="text-sm text-white/70">Latest updates across work orders, permits, and compliance</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/20 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading && items.length === 0
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/10" />
            ))
          : null}
        {!loading && !items.length ? (
          <p className="text-sm text-white/70">No activity recorded in the last 24 hours.</p>
        ) : null}
        {items.map((item) => {
          const Icon = resolveIcon(item.type);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.link)}
              className={clsx(
                "w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition",
                item.link ? "hover:border-white/30 hover:bg-white/10" : "cursor-default",
              )}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div className="flex flex-1 items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span>{item.type}</span>
                      {item.ref ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
                          {item.ref}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-white/80">{item.action}</p>
                    <p className="text-xs text-white/60">{item.user}</p>
                  </div>
                  <div className="whitespace-nowrap text-xs text-white/60">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type StatusSummaryProps = {
  statuses: StatusSummaryItem[];
  updatedAt: string | null;
  loading: boolean;
};

function StatusSummary({ statuses, updatedAt, loading }: StatusSummaryProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Status legend</h2>
          <p className="text-sm text-white/70">Live status definitions across the platform</p>
        </div>
        {updatedAt ? (
          <span className="text-xs text-white/60">
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-9 w-32 animate-pulse rounded-full bg-white/10" />
            ))
          : statuses.map((status) => (
              <div
                key={status.label}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white"
              >
                <span className={clsx("h-2.5 w-2.5 rounded-full", mapStatusColorClass(status.color))} />
                <StatusBadge status={status.label} size="sm" />
              </div>
            ))}
      </div>
    </section>
  );
}

type AssetAvailabilityProps = {
  overall: number;
  critical: number;
};

function AssetAvailabilityWidget({ overall, critical }: AssetAvailabilityProps) {
  const clampPercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Number(value)));
  };

  const renderBar = (label: string, value: number, colorClass: string) => (
    <div key={label}>
      <div className="flex items-center justify-between text-xs text-white/60">
        <span>{label}</span>
        <span>{Math.round(clampPercent(value))}%</span>
      </div>
      <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={clsx("h-full rounded-full", colorClass)}
          style={{ width: `${clampPercent(value)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-white/60">Asset availability</p>
      <div className="mt-3 space-y-3">
        {renderBar("Overall fleet", overall, "bg-sky-400")}
        {renderBar("Critical assets", critical, "bg-rose-400")}
      </div>
      <p className="mt-3 text-xs text-white/60">
        Comparing uptime for all assets versus equipment marked as high criticality.
      </p>
    </div>
  );
}

type FiltersProps = {
  filters: FilterState;
  departments: SelectOption[];
  lines: LineOption[];
  loading: boolean;
  onChange: (field: keyof FilterState, value: string) => void;
};

function DashboardFilters({ filters, departments, lines, loading, onChange }: FiltersProps) {
  const lineOptions = useMemo(() => {
    if (filters.department === "all") {
      return lines;
    }
    return lines.filter((line) => line.departmentId === filters.department);
  }, [filters.department, lines]);

  const renderSelect = (
    label: string,
    value: string,
    options: SelectOption[],
    field: keyof FilterState,
  ) => (
    <label className="flex flex-col gap-1 text-sm text-white/80">
      <span className="text-xs uppercase tracking-widest text-white/50">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        disabled={loading && options.length === 0}
        className="w-full min-w-[10rem] rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white shadow-sm focus:border-white/40 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renderSelect(
        "Department",
        filters.department,
        [{ value: "all", label: "All departments" }, ...departments],
        "department",
      )}
      {renderSelect(
        "Line",
        filters.line,
        [{ value: "all", label: "All lines" }, ...lineOptions],
        "line",
      )}
      {renderSelect("Status", filters.status, STATUS_FILTERS, "status")}
    </div>
  );
}
export default function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>(() => loadSavedFilters());
  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryTrends, setSummaryTrends] = useState<SummaryTrends | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const [livePulse, setLivePulse] = useState<LivePulseMetrics | null>(null);
  const [livePulseLoading, setLivePulseLoading] = useState(false);
  const [livePulseError, setLivePulseError] = useState<string | null>(null);

  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [statusLegend, setStatusLegend] = useState<{ statuses: StatusSummaryItem[]; updatedAt: string | null }>(
    { statuses: [], updatedAt: null },
  );
  const [statusLoading, setStatusLoading] = useState(false);

  const [isTechnician, setIsTechnician] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const livePulseRef = useRef<LivePulseMetrics | null>(null);
  const apiUnavailableRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    safeLocalStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    livePulseRef.current = livePulse;
  }, [livePulse]);
  const getQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.department !== "all") params.department = filters.department;
    if (filters.line !== "all") params.line = filters.line;
    if (filters.status !== "all") params.status = filters.status;
    if (isTechnician) params.assignedTo = "me";
    return params;
  }, [filters, isTechnician]);

  const fetchSummary = useCallback(async () => {
    if (!filtersHydrated || optionsLoading) {
      return;
    }
    setSummaryLoading(true);
    setSummaryError(null);
    const params = getQueryParams();
    if (isOffline() || apiUnavailableRef.current) {
      if (!mountedRef.current) return;
      setSummary(SUMMARY_FALLBACK);
      setSummaryTrends(SUMMARY_TRENDS_FALLBACK);
      setSummaryLoading(false);
      return;
    }
    try {
      const [summaryRes, trendsRes] = await Promise.all([
        http.get<SummaryResponse>("/summary", { params }),
        http.get<SummaryTrends>("/summary/trends", { params }),
      ]);
      if (!mountedRef.current) return;
      apiUnavailableRef.current = false;
      setSummary(summaryRes.data);
      setSummaryTrends(trendsRes.data);
    } catch (error) {
      if (!mountedRef.current) return;
      setSummary(SUMMARY_FALLBACK);
      setSummaryTrends(SUMMARY_TRENDS_FALLBACK);
      if (isNetworkError(error)) {
        apiUnavailableRef.current = true;
      }
      setSummaryError(formatErrorMessage(error, "Unable to load dashboard summary"));
    } finally {
      if (!mountedRef.current) return;
      setSummaryLoading(false);
    }
  }, [filtersHydrated, getQueryParams, optionsLoading]);

  const fetchLivePulse = useCallback(async () => {
    if (!filtersHydrated || optionsLoading) {
      return;
    }
    if (!livePulseRef.current) {
      setLivePulseLoading(true);
    }
    setLivePulseError(null);
    if (isOffline() || apiUnavailableRef.current) {
      if (!mountedRef.current) return;
      setLivePulse(LIVE_PULSE_FALLBACK);
      setLivePulseLoading(false);
      return;
    }
    try {
      const params = getQueryParams();
      const { data } = await http.get<LivePulseMetrics>("/dashboard/live-pulse", { params });
      if (!mountedRef.current) return;
      apiUnavailableRef.current = false;
      setLivePulse(data);
    } catch (error) {
      if (!mountedRef.current) return;
      setLivePulse(LIVE_PULSE_FALLBACK);
      if (isNetworkError(error)) {
        apiUnavailableRef.current = true;
      }
      setLivePulseError(formatErrorMessage(error, "Unable to load live pulse"));
    } finally {
      if (!mountedRef.current) return;
      setLivePulseLoading(false);
    }
  }, [filtersHydrated, getQueryParams, optionsLoading]);

  const fetchActivity = useCallback(async () => {
    if (!filtersHydrated || optionsLoading) {
      return;
    }
    if (recentActivity.length === 0) {
      setActivityLoading(true);
    }
    setActivityError(null);
    if (isOffline() || apiUnavailableRef.current) {
      if (!mountedRef.current) return;
      setRecentActivity(RECENT_ACTIVITY_FALLBACK);
      setActivityLoading(false);
      return;
    }
    try {
      const params = getQueryParams();
      const { data } = await http.get<RecentActivityItem[]>("/dashboard/recent-activity", { params });
      if (!mountedRef.current) return;
      apiUnavailableRef.current = false;
      setRecentActivity(data);
    } catch (error) {
      if (!mountedRef.current) return;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setRecentActivity(RECENT_ACTIVITY_FALLBACK);
        setActivityError(null);
        return;
      }
      setRecentActivity(RECENT_ACTIVITY_FALLBACK);
      if (isNetworkError(error)) {
        apiUnavailableRef.current = true;
      }
      setActivityError(formatErrorMessage(error, "Unable to load recent activity"));
    } finally {
      if (!mountedRef.current) return;
      setActivityLoading(false);
    }
  }, [filtersHydrated, getQueryParams, optionsLoading, recentActivity.length]);

  const fetchStatuses = useCallback(async () => {
    setStatusLoading(true);
    if (isOffline() || apiUnavailableRef.current) {
      if (!mountedRef.current) return;
      setStatusLegend(STATUS_LEGEND_FALLBACK);
      setStatusLoading(false);
      return;
    }
    try {
      const { data } = await http.get<{ statuses: StatusSummaryItem[]; updatedAt?: string }>("/status");
      if (!mountedRef.current) return;
      apiUnavailableRef.current = false;
      setStatusLegend({ statuses: data.statuses ?? [], updatedAt: data.updatedAt ?? null });
    } catch (error) {
      if (!mountedRef.current) return;
      setStatusLegend(STATUS_LEGEND_FALLBACK);
      if (isNetworkError(error)) {
        apiUnavailableRef.current = true;
      }
    } finally {
      if (!mountedRef.current) return;
      setStatusLoading(false);
    }
  }, []);

  const handleExportPdf = useCallback(async () => {
    setExportError(null);
    setExportingPdf(true);
    try {
      const params = getQueryParams();
      const response = await http.get<Blob>("/dashboard/export.pdf", {
        params,
        responseType: "blob",
      });
      if (!mountedRef.current) return;
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workpro3-dashboard-${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (!mountedRef.current) return;
      setExportError(formatErrorMessage(error, "Unable to export dashboard PDF"));
    } finally {
      if (!mountedRef.current) return;
      setExportingPdf(false);
    }
  }, [getQueryParams]);
  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      setOptionsLoading(true);
      setFiltersHydrated(false);
      try {
        if (isOffline() || apiUnavailableRef.current) {
          if (cancelled || !mountedRef.current) return;
          setDepartments(DEPARTMENT_FALLBACK);
          setLines(LINE_FALLBACK);
          setFiltersHydrated(true);
          return;
        }
        const [deptRes, lineRes] = await Promise.all([
          http.get<Array<{ _id: string; name: string }>>("/departments"),
          http.get<Array<{ _id: string; name: string; departmentId?: string }>>("/lines"),
        ]);
        if (cancelled || !mountedRef.current) return;
        apiUnavailableRef.current = false;
        setDepartments(deptRes.data.map((item) => ({ value: item._id, label: item.name })));
        setLines(
          lineRes.data.map((line) => {
            const option: LineOption = {
              value: line._id,
              label: line.name,
            };

            if (line.departmentId) {
              option.departmentId = line.departmentId;
            }

            return option;
          }),
        );
        setFiltersHydrated(true);
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
        setDepartments(DEPARTMENT_FALLBACK);
        setLines(LINE_FALLBACK);
        if (isNetworkError(error)) {
          apiUnavailableRef.current = true;
        }
        setFiltersHydrated(true);
      } finally {
        if (cancelled || !mountedRef.current) return;
        setOptionsLoading(false);
      }
    };

    const loadUser = async () => {
      try {
        if (isOffline() || apiUnavailableRef.current) {
          if (!mountedRef.current) return;
          setIsTechnician(false);
          return;
        }
        const { data } = await http.get<{ roles?: string[] }>("/auth/me");
        if (!mountedRef.current) return;
        apiUnavailableRef.current = false;
        const roles = data?.roles ?? [];
        setIsTechnician(roles.some((role) => role === "technician" || role === "tech"));
      } catch (error) {
        if (!mountedRef.current) return;
        setIsTechnician(false);
        if (isNetworkError(error)) {
          apiUnavailableRef.current = true;
        }
      }
    };

    void Promise.all([loadOptions(), loadUser(), fetchStatuses()]);

    return () => {
      cancelled = true;
    };
  }, [fetchStatuses]);

  useEffect(() => {
    if (departments.length === 0 && lines.length === 0) {
      return;
    }

    setFilters((prev) => {
      let nextDepartment = prev.department;
      let nextLine = prev.line;
      let changed = false;

      if (nextDepartment !== "all" && !departments.some((option) => option.value === nextDepartment)) {
        nextDepartment = "all";
        changed = true;
      }

      const availableLines =
        nextDepartment === "all" ? lines : lines.filter((line) => line.departmentId === nextDepartment);

      if (nextLine !== "all" && !availableLines.some((option) => option.value === nextLine)) {
        nextLine = "all";
        changed = true;
      }

      if (!changed) {
        return prev;
      }

      return { ...prev, department: nextDepartment, line: nextLine };
    });
  }, [departments, lines]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchLivePulse();
    const interval = window.setInterval(() => {
      void fetchLivePulse();
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchLivePulse]);

  useEffect(() => {
    void fetchActivity();
    const interval = window.setInterval(() => {
      void fetchActivity();
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchActivity]);

  useEffect(() => {
    const handleOnline = () => {
      apiUnavailableRef.current = false;
      void fetchSummary();
      void fetchLivePulse();
      void fetchActivity();
      void fetchStatuses();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [fetchActivity, fetchLivePulse, fetchStatuses, fetchSummary]);
  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => {
      if (field === "department") {
        return { department: value, line: "all", status: prev.status };
      }
      return { ...prev, [field]: value };
    });
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const pmAnalyticsQuery = usePmCompletionAnalytics(6);
  const pmTrend = pmAnalyticsQuery.data?.trend ?? [];
  const pmTotals = pmAnalyticsQuery.data?.totals;
  const pmCompletionSparkline = useMemo(
    () => pmTrend.map((point: PmCompletionPoint) => Number(point.completionRate ?? 0)),
    [pmTrend],
  );

  const summaryCards = useMemo(() => {
    const trends: SummaryTrends = {
      pmCompliance: Array.isArray(summaryTrends?.pmCompliance)
        ? summaryTrends?.pmCompliance
        : SUMMARY_TRENDS_FALLBACK.pmCompliance,
      woBacklog: Array.isArray(summaryTrends?.woBacklog)
        ? summaryTrends?.woBacklog
        : SUMMARY_TRENDS_FALLBACK.woBacklog,
      downtimeThisMonth: Array.isArray(summaryTrends?.downtimeThisMonth)
        ? summaryTrends?.downtimeThisMonth
        : SUMMARY_TRENDS_FALLBACK.downtimeThisMonth,
      costMTD: Array.isArray(summaryTrends?.costMTD)
        ? summaryTrends?.costMTD
        : SUMMARY_TRENDS_FALLBACK.costMTD,
      cmVsPmRatio: Array.isArray(summaryTrends?.cmVsPmRatio)
        ? summaryTrends?.cmVsPmRatio
        : SUMMARY_TRENDS_FALLBACK.cmVsPmRatio,
      wrenchTimePct: Array.isArray(summaryTrends?.wrenchTimePct)
        ? summaryTrends?.wrenchTimePct
        : SUMMARY_TRENDS_FALLBACK.wrenchTimePct,
      mttr: Array.isArray(summaryTrends?.mttr) ? summaryTrends?.mttr : SUMMARY_TRENDS_FALLBACK.mttr,
      slaCompliance: Array.isArray(summaryTrends?.slaCompliance)
        ? summaryTrends?.slaCompliance
        : SUMMARY_TRENDS_FALLBACK.slaCompliance,
    };
    const data = {
      openWorkOrders: summary?.openWorkOrders ?? SUMMARY_FALLBACK.openWorkOrders,
      overdueWorkOrders: summary?.overdueWorkOrders ?? SUMMARY_FALLBACK.overdueWorkOrders,
      completedWorkOrders: summary?.completedWorkOrders ?? SUMMARY_FALLBACK.completedWorkOrders,
      pmDueNext7Days: summary?.pmDueNext7Days ?? SUMMARY_FALLBACK.pmDueNext7Days,
      permitsOpen: summary?.permitsOpen ?? SUMMARY_FALLBACK.permitsOpen,
      complianceScore: summary?.complianceScore ?? SUMMARY_FALLBACK.complianceScore,
      assetAvailability: summary?.assetAvailability ?? SUMMARY_FALLBACK.assetAvailability,
      assetAvailabilityCritical:
        summary?.assetAvailabilityCritical ?? SUMMARY_FALLBACK.assetAvailabilityCritical,
      activePmTasks: summary?.activePmTasks ?? SUMMARY_FALLBACK.activePmTasks,
      pmCompliance: summary?.pmCompliance ?? SUMMARY_FALLBACK.pmCompliance,
      woBacklog: summary?.woBacklog ?? SUMMARY_FALLBACK.woBacklog,
      downtimeThisMonth: summary?.downtimeThisMonth ?? SUMMARY_FALLBACK.downtimeThisMonth,
      costMTD: summary?.costMTD ?? SUMMARY_FALLBACK.costMTD,
      cmVsPmRatio: summary?.cmVsPmRatio ?? SUMMARY_FALLBACK.cmVsPmRatio,
      wrenchTimePct: summary?.wrenchTimePct ?? SUMMARY_FALLBACK.wrenchTimePct,
      mttr: summary?.mttr ?? SUMMARY_FALLBACK.mttr,
      slaCompliance: summary?.slaCompliance ?? SUMMARY_FALLBACK.slaCompliance,
    } satisfies SummaryResponse;
    return [
      {
        key: "open",
        title: "Open work orders",
        description: "Currently active tasks awaiting completion",
        value: data.openWorkOrders,
        icon: ClipboardListIcon,
        gradient: "from-indigo-900 via-indigo-800 to-indigo-600",
        trend: trends.woBacklog,
        href: "/workorders?status=open",
      },
      {
        key: "overdue",
        title: "Overdue work orders",
        description: "Items past their due dates",
        value: data.overdueWorkOrders,
        icon: AlertTriangleIcon,
        gradient: "from-rose-900 via-rose-800 to-rose-600",
        trend: trends.woBacklog,
        href: "/workorders?status=overdue",
      },
      {
        key: "pmDue",
        title: "PM due in 7 days",
        description: "Preventive tasks scheduled this week",
        value: data.pmDueNext7Days,
        icon: CalendarClockIcon,
        gradient: "from-amber-900 via-amber-700 to-amber-500",
        trend: trends.pmCompliance,
        href: "/pm?filter=upcoming",
      },
      {
        key: "compliance",
        title: "Compliance score",
        description: "Preventive maintenance adherence",
        value: data.complianceScore,
        suffix: "%",
        icon: ShieldCheckIcon,
        gradient: "from-emerald-900 via-emerald-700 to-emerald-500",
        trend: trends.pmCompliance.map((value) => {
          const numericValue = typeof value === "number" ? value : 0;
          return Number((numericValue * 100).toFixed(1));
        }),
        decimals: 1,
        href: "/analytics/compliance",
      },
      {
        key: "mttr",
        title: "Mean time to repair",
        description: "Average resolution time for corrective work",
        value: data.mttr,
        suffix: "h",
        icon: TimerIcon,
        gradient: "from-cyan-900 via-cyan-700 to-cyan-500",
        trend: trends.mttr,
        decimals: 1,
        href: "/analytics/maintenance?metric=mttr",
      },
      {
        key: "asset",
        title: "Asset availability",
        description: `Overall uptime • Critical: ${data.assetAvailabilityCritical}%`,
        value: data.assetAvailability,
        suffix: "%",
        icon: GaugeCircleIcon,
        gradient: "from-blue-900 via-blue-700 to-cyan-500",
        trend: trends.wrenchTimePct,
        decimals: 1,
        href: "/assets",
      },
      {
        key: "permits",
        title: "Open permits",
        description: "Permits awaiting approval or closure",
        value: data.permitsOpen,
        icon: ActivityIcon,
        gradient: "from-purple-900 via-purple-700 to-fuchsia-600",
        trend: trends.costMTD,
        href: "/permits",
      },
    ];
  }, [summary, summaryTrends]);
  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Operations dashboard"
        subtitle="Monitor maintenance workload, compliance, and live system health at a glance."
      />

        <AlertBanner />

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <OnboardingWizard />
          <HelpCenterViewer />
        </div>

        <DashboardFilters
          filters={filters}
          departments={departments}
          lines={lines}
          loading={optionsLoading}
          onChange={handleFilterChange}
        />

        {summaryError ? (
          <div className="rounded-3xl border border-red-400/60 bg-red-500/20 p-4 text-sm text-red-100">
            {summaryError}
          </div>
        ) : null}

        <DashboardAnalyticsPanel />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <SummaryCard
              key={card.key}
              title={card.title}
              description={card.description}
              value={card.value}
              {...(card.suffix ? { suffix: card.suffix } : {})}
              icon={card.icon}
              gradient={card.gradient}
              trend={card.trend}
              loading={summaryLoading}
              decimals={card.decimals ?? 0}
              href={card.href}
            />
          ))}
        </section>

        <LivePulseSection
          metrics={livePulse}
          loading={livePulseLoading}
          error={livePulseError}
          onRefresh={fetchLivePulse}
          onNavigate={navigateTo}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <RecentActivitySection
            items={recentActivity}
            loading={activityLoading}
            error={activityError}
            onRefresh={fetchActivity}
            onNavigate={(link) => {
              if (link) navigateTo(link);
            }}
          />
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Maintenance analytics</h2>
                <p className="text-sm text-white/70">Preventive trend highlights</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-60"
                onClick={handleExportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? "Exporting…" : "Export PDF"}
                <FileDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {exportError ? (
              <p className="mt-3 text-xs text-red-200">{exportError}</p>
            ) : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">PM compliance trend</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {summary ? `${Math.round(summary.pmCompliance * 100)}%` : "–"}
                  </span>
                  <span className="text-xs text-white/60">last 10 periods</span>
                </div>
                <Sparkline
                  data={(summaryTrends?.pmCompliance ?? []).map((value) => {
                    const numericValue = typeof value === "number" ? value : 0;
                    return Number((numericValue * 100).toFixed(1));
                  })}
                  color="rgba(255,255,255,0.8)"
                  className="mt-4 h-16 w-full"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">SLA compliance</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {summary
                      ? `${(summary.slaCompliance ?? SUMMARY_FALLBACK.slaCompliance).toFixed(1)}%`
                      : "–"}
                  </span>
                  <span className="text-xs text-white/60">on-time commitments</span>
                </div>
                <Sparkline
                  data={summaryTrends?.slaCompliance ?? []}
                  color="rgba(255,255,255,0.8)"
                  className="mt-4 h-16 w-full"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/60">Wrench time %</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {summary
                      ? `${(summary.wrenchTimePct ?? SUMMARY_FALLBACK.wrenchTimePct).toFixed(1)}%`
                      : "–"}
                  </span>
                  <span className="text-xs text-white/60">labor utilisation</span>
                </div>
                <Sparkline
                  data={summaryTrends?.wrenchTimePct ?? []}
                  color="rgba(255,255,255,0.8)"
                  className="mt-4 h-16 w-full"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/60">PM completion</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-semibold">
                        {pmTotals ? `${(pmTotals.completionRate ?? 0).toFixed(1)}%` : "–"}
                      </span>
                      <span className="text-xs text-white/60">last 6 months</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => navigateTo("/analytics/pm")}
                  >
                    View
                    <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <Sparkline
                  data={pmCompletionSparkline}
                  color="rgba(59, 130, 246, 0.9)"
                  className="mt-4 h-16 w-full"
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/70">
                  <div>
                    <span className="block text-[11px] uppercase text-white/50">On-time</span>
                    <span className="font-semibold">{pmTotals?.onTime ?? 0}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-white/50">Late</span>
                    <span className="font-semibold">{pmTotals?.late ?? 0}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase text-white/50">Missed</span>
                    <span className="font-semibold">{pmTotals?.missed ?? 0}</span>
                  </div>
                </div>
              </div>
              <AssetAvailabilityWidget
                overall={summary?.assetAvailability ?? 0}
                critical={summary?.assetAvailabilityCritical ?? 0}
              />
            </div>
          </Card>
        </div>

        <StatusSummary
          statuses={statusLegend.statuses}
          updatedAt={statusLegend.updatedAt}
          loading={statusLoading}
        />
    </div>
  );
}

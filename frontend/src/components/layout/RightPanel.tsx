/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from "react";
import { Activity, CheckCircle2, TrendingUp, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useSettingsStore } from "@/store/settingsStore";

type Insight = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "success" | "info" | "warning";
};

export default function RightPanel() {
  const { pathname } = useLocation();
  const setTheme = useSettingsStore((state) => state.setTheme);

  const panelConfig = useMemo(() => {
    const base = {
      title: "Live plant status",
      subtitle: "Updated every 60 seconds from the command center.",
      insights: [
        {
          id: "wrench-time",
          label: "Wrench time",
          value: "68%",
          description: "Technicians spent more time on planned work this week.",
          tone: "success",
        },
        {
          id: "compliance",
          label: "Compliance score",
          value: "92%",
          description: "Audit items completed on schedule.",
          tone: "info",
        },
        {
          id: "downtime",
          label: "Downtime",
          value: "4h 12m",
          description: "Downtime decreased 12% vs last week.",
          tone: "success",
        },
      ],
      highlightTitle: "Performance insight",
      highlight:
        "Preventive maintenance compliance has exceeded the target for three consecutive weeks. Keep schedules tight to sustain performance.",
    };

    if (pathname.startsWith("/assets")) {
      return {
        ...base,
        title: "Asset focus",
        subtitle: "Availability and reliability for top assets.",
        insights: [
          {
            id: "asset-availability",
            label: "Availability",
            value: "94%",
            description: "Critical assets stayed online this week.",
            tone: "success",
          },
          {
            id: "mtbf",
            label: "MTBF",
            value: "132h",
            description: "Mean time between failures is trending upward.",
            tone: "info",
          },
          {
            id: "service-window",
            label: "Service window",
            value: "6 due",
            description: "Assets due for maintenance in 7 days.",
            tone: "warning",
          },
        ],
        highlightTitle: "Asset insight",
        highlight: "Focus inspections on Line 2 conveyors to keep uptime above 95%.",
      };
    }

    if (pathname.startsWith("/work-orders") || pathname.startsWith("/workorders")) {
      return {
        ...base,
        title: "Work order pulse",
        subtitle: "Live backlog and SLA health.",
        insights: [
          {
            id: "backlog",
            label: "Backlog",
            value: "38",
            description: "Open work orders requiring action.",
            tone: "warning",
          },
          {
            id: "sla",
            label: "SLA compliance",
            value: "91%",
            description: "On-time completion in the last 30 days.",
            tone: "success",
          },
          {
            id: "overdue",
            label: "Overdue",
            value: "7",
            description: "Priority items past due date.",
            tone: "warning",
          },
        ],
        highlightTitle: "Dispatch tip",
        highlight: "Assign critical repairs early to protect SLA performance.",
      };
    }

    if (pathname.startsWith("/inventory")) {
      return {
        ...base,
        title: "Inventory watch",
        subtitle: "Stock levels and reorder alerts.",
        insights: [
          {
            id: "low-stock",
            label: "Low stock",
            value: "5 parts",
            description: "Below minimum threshold.",
            tone: "warning",
          },
          {
            id: "turns",
            label: "Inventory turns",
            value: "4.1x",
            description: "Quarterly turns trending up.",
            tone: "success",
          },
          {
            id: "open-pos",
            label: "Open POs",
            value: "12",
            description: "Awaiting receiving.",
            tone: "info",
          },
        ],
        highlightTitle: "Reorder tip",
        highlight: "Batch replenishment for fast-moving parts to reduce rush orders.",
      };
    }

    if (pathname.startsWith("/pm")) {
      return {
        ...base,
        title: "Preventive maintenance",
        subtitle: "Upcoming PM schedules and compliance.",
        insights: [
          {
            id: "pm-due",
            label: "PM due",
            value: "16",
            description: "Scheduled in the next 7 days.",
            tone: "warning",
          },
          {
            id: "pm-compliance",
            label: "Compliance",
            value: "93%",
            description: "Trend steady for the last 4 weeks.",
            tone: "success",
          },
          {
            id: "pm-backlog",
            label: "Backlog",
            value: "4",
            description: "PM tasks overdue.",
            tone: "warning",
          },
        ],
        highlightTitle: "PM insight",
        highlight: "Shift upcoming PM work to cover weekend downtime windows.",
      };
    }

    return base;
  }, [pathname]);

  const insights = panelConfig.insights as Insight[];

  return (
    <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-slate-950/70 px-5 py-6 text-white backdrop-blur-md transition-colors xl:flex">
      <div className="flex w-full flex-col gap-5">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white/90">{panelConfig.title}</h2>
              <p className="mt-1 text-xs text-white/60">{panelConfig.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme({ rightPanelCollapsed: true })}
              className="rounded-md p-1 text-white/60 transition hover:text-white"
              aria-label="Hide insights panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2"
              >
                <dt className="text-xs uppercase tracking-wide text-white/50">{insight.label}</dt>
                <dd className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
                  <span>{insight.value}</span>
                  {insight.tone === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : insight.tone === "info" ? (
                    <Activity className="h-4 w-4 text-sky-400" />
                  ) : null}
                </dd>
                <p className="mt-1 text-xs text-white/60">{insight.description}</p>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <TrendingUp className="h-4 w-4 text-sky-300" />
            {panelConfig.highlightTitle}
          </h3>
          <p className="mt-2 text-white/70">{panelConfig.highlight}</p>
        </section>
      </div>
    </aside>
  );
}

/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from "react";
import { Activity, CheckCircle2, TrendingUp } from "lucide-react";

type Insight = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "success" | "info" | "warning";
};

export default function RightPanel() {
  const insights = useMemo<Insight[]>(
    () => [
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
    [],
  );

  return (
    <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-slate-950/70 px-5 py-6 text-white backdrop-blur-md transition-colors xl:flex">
      <div className="flex w-full flex-col gap-5">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-white/90">Live plant status</h2>
          <p className="mt-1 text-xs text-white/60">
            Updated every 60 seconds from the command center.
          </p>
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
            Performance insight
          </h3>
          <p className="mt-2 text-white/70">
            Preventive maintenance compliance has exceeded the target for three consecutive weeks. Keep schedules tight to sustain performance.
          </p>
        </section>
      </div>
    </aside>
  );
}

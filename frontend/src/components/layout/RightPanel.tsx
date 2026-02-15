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
    <aside className="hidden w-80 shrink-0 border-l border-neutral-200 bg-white/50 px-5 py-6 backdrop-blur-md transition-colors dark:border-neutral-800 dark:bg-neutral-900/60 xl:flex">
      <div className="flex w-full flex-col gap-5">
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Live plant status</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Updated every 60 seconds from the command center.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-800/60">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">{insight.label}</dt>
                <dd className="mt-1 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  <span>{insight.value}</span>
                  {insight.tone === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : insight.tone === "info" ? (
                    <Activity className="h-4 w-4 text-sky-500" />
                  ) : null}
                </dd>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{insight.description}</p>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-sm shadow-sm dark:border-primary-500/20 dark:bg-primary-500/10">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-primary-100">
            <TrendingUp className="h-4 w-4" />
            Performance insight
          </h3>
          <p className="mt-2 text-primary-700 dark:text-primary-100/80">
            Preventive maintenance compliance has exceeded the target for three consecutive weeks. Keep schedules tight to sustain performance.
          </p>
        </section>
      </div>
    </aside>
  );
}

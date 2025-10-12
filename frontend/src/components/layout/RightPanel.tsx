/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

const highlights = [
  {
    title: 'Critical alerts',
    value: '3 open',
    detail: 'Two permits awaiting escalation',
    icon: AlertTriangle,
    tone: 'error' as const,
  },
  {
    title: 'Maintenance due',
    value: '8 jobs',
    detail: 'Scheduled in the next 7 days',
    icon: CalendarClock,
    tone: 'warning' as const,
  },
  {
    title: 'Compliance score',
    value: '97%',
    detail: '↑ 4% vs. last week',
    icon: CheckCircle2,
    tone: 'success' as const,
  },
];

const toneStyles: Record<typeof highlights[number]['tone'], string> = {
  error: 'border-error-500/40 bg-error-500/10 text-error-100',
  warning: 'border-warning-500/40 bg-warning-500/10 text-warning-100',
  success: 'border-success-500/40 bg-success-500/10 text-success-100',
};

export default function RightPanel() {
  return (
    <aside className="relative hidden w-80 flex-col border-l border-white/10 bg-slate-900/40 px-6 py-8 text-white/80 backdrop-blur-xl lg:flex xl:w-96">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>Live pulse</span>
        <span className="text-xs text-white/60">Updated moments ago</span>
      </div>

      <div className="mt-4 space-y-4">
        {highlights.map(({ title, value, detail, icon: Icon, tone }) => (
          <div
            key={title}
            className={`relative overflow-hidden rounded-2xl border ${toneStyles[tone]} p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)]`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{title}</p>
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="text-xs text-white/70">{detail}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <div className="pointer-events-none absolute -right-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-100">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Daily planning</p>
            <p className="mt-1 text-xs text-white/70">
              Review work orders scheduled for today and confirm technician assignments before the morning stand-up.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-white/70">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-success-400" />
            <span>5 technicians checked in</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-warning-400" />
            <span>2 permits require approval</span>
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="mt-4 inline-flex w-full items-center justify-between rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-500"
        >
          Launch planner
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Workflow tip</p>
            <p className="text-xs text-white/70">
              Convert recurring issues into smart maintenance templates to auto-schedule preventive tasks.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}


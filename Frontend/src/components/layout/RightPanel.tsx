/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import useApi from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';

type LivePulseMetrics = {
  criticalAlerts: number;
  maintenanceDue: number;
  complianceScore: number;
  updatedAt?: string;
};

const toneStyles: Record<'error' | 'warning' | 'success', string> = {
  error: 'border-error-500/40 bg-error-500/10 text-error-100',
  warning: 'border-warning-500/40 bg-warning-500/10 text-warning-100',
  success: 'border-success-500/40 bg-success-500/10 text-success-100',
};

export default function RightPanel() {
  const { request: fetchPulse, loading, error } = useApi<LivePulseMetrics>();
  const { request: logLaunch, loading: launching } = useApi<{ message: string }>();
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState<LivePulseMetrics | null>(null);

  const refresh = useMemo(
    () => async () => {
      try {
        const data = await fetchPulse('/dashboard/live-pulse');
        setMetrics(data);
      } catch {
        addToast('Failed to load live metrics', 'error');
      }
    },
    [fetchPulse, addToast],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatedLabel = metrics?.updatedAt
    ? new Date(metrics.updatedAt).toLocaleTimeString()
    : loading
    ? 'Updating…'
    : error
    ? 'Unavailable'
    : 'Just now';

  const highlightCards = useMemo(() => {
    const critical = metrics?.criticalAlerts ?? 0;
    const maintenance = metrics?.maintenanceDue ?? 0;
    const compliance = metrics?.complianceScore ?? 0;

    return [
      {
        key: 'critical',
        title: 'Critical alerts',
        value: loading ? '—' : `${critical} open`,
        detail:
          critical > 0
            ? 'Review escalated jobs immediately'
            : 'No active escalations',
        icon: AlertTriangle,
        tone: 'error' as const,
      },
      {
        key: 'maintenance',
        title: 'Maintenance due',
        value: loading ? '—' : `${maintenance} jobs`,
        detail:
          maintenance > 0
            ? 'Scheduled within the next 7 days'
            : 'All maintenance on schedule',
        icon: CalendarClock,
        tone: 'warning' as const,
      },
      {
        key: 'compliance',
        title: 'Compliance score',
        value: loading ? '—' : `${compliance.toFixed(1)}%`,
        detail:
          compliance >= 95
            ? 'Excellent adherence this week'
            : 'Monitor preventive compliance closely',
        icon: CheckCircle2,
        tone: 'success' as const,
      },
    ];
  }, [metrics, loading]);

  const handleLaunchPlanner = async () => {
    try {
      await logLaunch('/dashboard/command-center/launch', 'POST');
      addToast('Planner launch recorded');
    } catch {
      addToast('Unable to launch planner', 'error');
    }
  };

  return (
    <aside className="relative hidden w-80 flex-col border-l border-white/10 bg-slate-900/40 px-6 py-8 text-white/80 backdrop-blur-xl lg:flex xl:w-96">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>Live pulse</span>
        <span className="text-xs text-white/60">{updatedLabel}</span>
      </div>

      <div className="mt-4 space-y-4">
        {highlightCards.map(({ key, title, value, detail, icon: Icon, tone }) => (
          <div
            key={key}
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
        {error && (
          <div className="rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs text-error-100">
            {error}
          </div>
        )}
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
            <span>{metrics ? `${Math.max(metrics.maintenanceDue - 1, 0)} technicians dispatched` : 'Loading crew status…'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-warning-400" />
            <span>
              {metrics ? `${metrics.criticalAlerts} permit${metrics.criticalAlerts === 1 ? '' : 's'} awaiting escalation` : 'Checking permits…'}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="default"
          className="mt-4 inline-flex w-full items-center justify-between rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-500"
          onClick={handleLaunchPlanner}
          disabled={launching}
        >
          <span className="flex items-center gap-2">
            {launching && <Loader2 className="h-4 w-4 animate-spin" />}
            Launch planner
          </span>
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


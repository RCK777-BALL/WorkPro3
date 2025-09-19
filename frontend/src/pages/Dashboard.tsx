/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import KpiCard from '@/components/dashboard/KpiCard';
import RecentActivity, { AuditLog } from '@/components/dashboard/RecentActivity';
import http from '@/lib/http';
import type { SafetyKpiResponse } from '@/types';

interface Summary {
  pmCompliance: number;
  woBacklog: number;
  downtimeThisMonth: number;
  costMTD: number;
  cmVsPmRatio: number;
  wrenchTimePct: number;
}

type Trends = Record<keyof Summary, number[]>;

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [safetyKpis, setSafetyKpis] = useState<SafetyKpiResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          http.get<Summary>('/summary'),
          http.get<Trends>('/summary/trends'),
        ]);
        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
      } catch (err) {
        console.error('Failed to load summary', err);
      }
    };
    fetchData();
    fetchSafetyKpis();
    refreshLogs();
  }, []);

  const fetchSafetyKpis = async () => {
    try {
      const res = await http.get<SafetyKpiResponse>('/permits/kpis');
      setSafetyKpis(res.data);
    } catch (err) {
      console.error('Failed to load safety KPIs', err);
    }
  };

  const refreshLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await http.get<AuditLog[]>('/audit', { params: { limit: 10 } });
      setLogs(res.data);
      setLogsError(null);
    } catch (err) {
      setLogsError('Failed to load activity');
    } finally {
      setLoadingLogs(false);
    }
  };

  const calcDelta = (series: number[] = []) => {
    if (series.length < 2) return 0;
    const first = series[0];
    const last = series[series.length - 1];
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  };

  const kpis = summary && trends ? [
    {
      key: 'pmCompliance',
      title: 'PM Compliance',
      value: `${Math.round(summary.pmCompliance * 100)}%`,
      deltaPct: calcDelta(trends.pmCompliance),
      series: trends.pmCompliance,
    },
    {
      key: 'woBacklog',
      title: 'WO Backlog',
      value: summary.woBacklog,
      deltaPct: calcDelta(trends.woBacklog),
      series: trends.woBacklog,
    },
    {
      key: 'downtimeThisMonth',
      title: 'Downtime (hrs)',
      value: summary.downtimeThisMonth,
      deltaPct: calcDelta(trends.downtimeThisMonth),
      series: trends.downtimeThisMonth,
    },
    {
      key: 'costMTD',
      title: 'Cost MTD',
      value: `$${summary.costMTD}`,
      deltaPct: calcDelta(trends.costMTD),
      series: trends.costMTD,
    },
    {
      key: 'cmVsPmRatio',
      title: 'CM vs PM Ratio',
      value: summary.cmVsPmRatio.toFixed(2),
      deltaPct: calcDelta(trends.cmVsPmRatio),
      series: trends.cmVsPmRatio,
    },
    {
      key: 'wrenchTimePct',
      title: 'Wrench Time %',
      value: `${summary.wrenchTimePct.toFixed(1)}%`,
      deltaPct: calcDelta(trends.wrenchTimePct),
      series: trends.wrenchTimePct,
    },
  ] : [];

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              title={k.title}
              value={k.value}
              deltaPct={k.deltaPct}
              series={k.series}
            />
          ))}
        </div>
        {safetyKpis && (
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              key="activePermits"
              title="Active Permits"
              value={safetyKpis.activeCount}
              deltaPct={0}
              series={[]}
            />
            <KpiCard
              key="overdueApprovals"
              title="Overdue Approvals"
              value={safetyKpis.overdueApprovals}
              deltaPct={0}
              series={[]}
            />
            <KpiCard
              key="incidents30"
              title="Incidents (30d)"
              value={safetyKpis.incidentsLast30}
              deltaPct={0}
              series={[]}
            />
          </div>
        )}
      </div>
      <div className="w-80">
        <RecentActivity
          logs={logs}
          loading={loadingLogs}
          error={logsError}
          onRefresh={refreshLogs}
        />
      </div>
    </div>
  );
}

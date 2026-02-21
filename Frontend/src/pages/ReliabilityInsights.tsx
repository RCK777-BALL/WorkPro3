/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import http from '@/lib/http';

type MttrMtbfPoint = {
  period: string;
  mttrHours: number;
  mtbfHours: number;
};

const unwrap = <T,>(value: any): T => (value?.data?.data ?? value?.data ?? value) as T;

export default function ReliabilityInsights() {
  const [trend, setTrend] = useState<MttrMtbfPoint[]>([]);
  const [utilization, setUtilization] = useState<Array<{ technicianName: string; utilizationRate: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [mttrRes, utilRes] = await Promise.all([
          http.get('/analytics/v2/metrics/mttr-mtbf'),
          http.get('/analytics/v2/metrics/technician-utilization'),
        ]);
        const mttrData = unwrap<{ points?: MttrMtbfPoint[] }>(mttrRes);
        const utilData = unwrap<{ technicians?: Array<{ technicianName: string; utilizationRate: number }> }>(utilRes);
        if (!cancelled) {
          setTrend(Array.isArray(mttrData?.points) ? mttrData.points : []);
          setUtilization(Array.isArray(utilData?.technicians) ? utilData.technicians : []);
        }
      } catch {
        if (!cancelled) {
          setTrend([]);
          setUtilization([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const latest = trend[trend.length - 1];
    const topUtilization = utilization.slice(0, 3);
    return { latest, topUtilization };
  }, [trend, utilization]);

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <div>
        <h1 className="text-2xl font-semibold">Reliability Insights</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Guided MTBF/MTTR and utilization insights with action-oriented recommendations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <Card.Content>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Current MTTR</p>
            <p className="mt-2 text-2xl font-semibold">{summary.latest ? `${summary.latest.mttrHours}h` : '—'}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Current MTBF</p>
            <p className="mt-2 text-2xl font-semibold">{summary.latest ? `${summary.latest.mtbfHours}h` : '—'}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Guided Action</p>
            <p className="mt-2 text-sm">
              {summary.latest && summary.latest.mttrHours > 8
                ? 'Reduce MTTR by tightening diagnostic checklists and parts staging.'
                : 'Maintain current process and monitor chronic-failure assets weekly.'}
            </p>
          </Card.Content>
        </Card>
      </div>

      <Card title="Top utilization technicians">
        <Card.Content className="space-y-2">
          {summary.topUtilization.map((entry) => (
            <div key={entry.technicianName} className="flex items-center justify-between rounded-md border border-[var(--wp-color-border)] p-2">
              <span>{entry.technicianName}</span>
              <Badge text={`${entry.utilizationRate}%`} />
            </div>
          ))}
          {!summary.topUtilization.length ? (
            <p className="text-sm text-[var(--wp-color-text-muted)]">No utilization telemetry available.</p>
          ) : null}
        </Card.Content>
      </Card>
    </div>
  );
}


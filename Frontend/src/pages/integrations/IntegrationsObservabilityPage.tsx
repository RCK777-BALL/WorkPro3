/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import http from '@/lib/http';

type ObservabilityRow = {
  id: string;
  connector: string;
  status: string;
  attempt: number;
  timestamp: string;
  detail: string;
};

type ObservabilityPayload = {
  rows: ObservabilityRow[];
  deadLetter: ObservabilityRow[];
};

const unwrap = <T,>(value: any): T => (value?.data?.data ?? value?.data ?? value) as T;

export default function IntegrationsObservabilityPage() {
  const [payload, setPayload] = useState<ObservabilityPayload>({ rows: [], deadLetter: [] });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await http.get('/integrations/observability');
        const data = unwrap<ObservabilityPayload>(response);
        if (!cancelled && data && typeof data === 'object') {
          setPayload({
            rows: Array.isArray(data.rows) ? data.rows : [],
            deadLetter: Array.isArray(data.deadLetter) ? data.deadLetter : [],
          });
        }
      } catch {
        if (!cancelled) setPayload({ rows: [], deadLetter: [] });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = payload.rows.length;
    const failed = payload.rows.filter((row) => row.status === 'failed').length;
    const success = payload.rows.filter((row) => row.status === 'success' || row.status === 'completed').length;
    return { total, failed, success };
  }, [payload.rows]);

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <div>
        <h1 className="text-2xl font-semibold">Integration Observability</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          Searchable connector run history, retries, and dead-letter queue.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Card><Card.Content><p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Total runs</p><p className="text-2xl font-semibold">{stats.total}</p></Card.Content></Card>
        <Card><Card.Content><p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Succeeded</p><p className="text-2xl font-semibold">{stats.success}</p></Card.Content></Card>
        <Card><Card.Content><p className="text-xs uppercase text-[var(--wp-color-text-muted)]">Failed</p><p className="text-2xl font-semibold">{stats.failed}</p></Card.Content></Card>
      </div>
      <Card title="Latest connector runs">
        <Card.Content className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--wp-color-text-muted)]">
                <th className="px-2 py-2">Connector</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Attempt</th>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {payload.rows.slice(0, 100).map((row) => (
                <tr key={row.id} className="border-t border-[var(--wp-color-border)]">
                  <td className="px-2 py-2">{row.connector}</td>
                  <td className="px-2 py-2">
                    <Badge text={row.status} color={row.status === 'failed' ? 'red' : row.status === 'success' || row.status === 'completed' ? 'green' : undefined} />
                  </td>
                  <td className="px-2 py-2">{row.attempt}</td>
                  <td className="px-2 py-2">{new Date(row.timestamp).toLocaleString()}</td>
                  <td className="px-2 py-2">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}


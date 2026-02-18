/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import http from '@/lib/http';

type Connector = {
  id: string;
  name: string;
  authType: string;
  syncMode: string;
  connected: boolean;
  health: 'healthy' | 'degraded' | 'offline' | string;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
};

const unwrap = <T,>(value: any): T => (value?.data?.data ?? value?.data ?? value) as T;

export default function IntegrationsCatalogPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await http.get('/integrations/catalog');
        const rows = unwrap<Connector[]>(response);
        if (!cancelled) setConnectors(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setConnectors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <div>
        <h1 className="text-2xl font-semibold">Integration Marketplace</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">
          View connector auth type, sync mode, and current health.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(loading ? new Array(3).fill(null) : connectors).map((connector, index) => (
          <Card key={connector?.id ?? `skeleton-${index}`}>
            <Card.Header>
              <Card.Title>{connector?.name ?? 'Loading...'}</Card.Title>
              <Card.Description>
                {connector ? `${connector.authType} · ${connector.syncMode}` : 'Connector metadata'}
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2 text-sm">
              {connector ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge text={connector.connected ? 'Connected' : 'Not connected'} />
                    <Badge
                      text={connector.health}
                      color={connector.health === 'healthy' ? 'green' : connector.health === 'degraded' ? 'amber' : 'red'}
                    />
                  </div>
                  <p className="text-[var(--wp-color-text-muted)]">
                    Last success: {connector.lastSuccessAt ? new Date(connector.lastSuccessAt).toLocaleString() : 'N/A'}
                  </p>
                  <p className="text-[var(--wp-color-text-muted)]">
                    Last failure: {connector.lastFailureAt ? new Date(connector.lastFailureAt).toLocaleString() : 'N/A'}
                  </p>
                </>
              ) : (
                <p className="text-[var(--wp-color-text-muted)]">Loading connector card…</p>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}


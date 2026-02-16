/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { SectionHeader } from '@/components/ui';
import http from '@/lib/http';
import { useToast } from '@/context/ToastContext';
import { useScopeContext } from '@/context/ScopeContext';
import { usePermissions } from '@/auth/usePermissions';
import type { WorkOrder } from '@/types';

type LaneStatus = 'assigned' | 'in_progress' | 'completed';

export default function DispatchBoard() {
  const { addToast } = useToast();
  const { activeTenant, activePlant } = useScopeContext();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get('/workorders', {
        params: {
          ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
          ...(activePlant?.id ? { siteId: activePlant.id } : {}),
        },
      });
      const rows = (res.data?.data ?? res.data ?? []) as WorkOrder[];
      const scopedRows = Array.isArray(rows)
        ? rows.filter(
            (item) =>
              (!activeTenant?.id || !item.tenantId || item.tenantId === activeTenant.id) &&
              (!activePlant?.id || !item.siteId || item.siteId === activePlant.id),
          )
        : [];
      setWorkOrders(scopedRows);
    } catch (error) {
      console.error(error);
      addToast('Failed to load dispatch board.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activePlant?.id, activeTenant?.id, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (item: WorkOrder, next: LaneStatus) => {
    if (!can('workorders', 'write')) {
      addToast('You do not have permission to update work orders.', 'error');
      return;
    }
    try {
      if (next === 'in_progress') {
        await http.post(`/workorders/${item.id}/start`, {});
      } else if (next === 'completed') {
        await http.post(`/workorders/${item.id}/complete`, {});
      } else {
        await http.put(`/workorders/${item.id}`, { status: 'assigned' });
      }
      addToast(`Work order moved to ${next.replace('_', ' ')}.`, 'success');
      await load();
    } catch (error) {
      console.error(error);
      addToast('Unable to update work order status.', 'error');
    }
  };

  const canManageWorkOrders = can('workorders', 'write');

  const lanes = useMemo(() => {
    const map: Record<LaneStatus, WorkOrder[]> = {
      assigned: [],
      in_progress: [],
      completed: [],
    };
    for (const order of workOrders) {
      if (order.status === 'assigned') map.assigned.push(order);
      if (order.status === 'in_progress') map.in_progress.push(order);
      if (order.status === 'completed') map.completed.push(order);
    }
    return map;
  }, [workOrders]);

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Dispatch Board"
        subtitle="Plan assignments by lane and move work orders through execution."
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Tenant: {activeTenant?.name ?? 'All tenants'}
        </span>
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Site: {activePlant?.name ?? 'All sites'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {([
          ['assigned', 'Assigned'],
          ['in_progress', 'In Progress'],
          ['completed', 'Completed'],
        ] as const).map(([key, title]) => (
          <Card key={key}>
            <Card.Header>
              <Card.Title>{title}</Card.Title>
              <Card.Description>{lanes[key].length} work orders</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3">
              {loading ? <p className="text-sm text-[var(--wp-color-text-muted)]">Loading...</p> : null}
              {!loading && lanes[key].length === 0 ? (
                <p className="text-sm text-[var(--wp-color-text-muted)]">No work orders in this lane.</p>
              ) : null}
              {lanes[key].map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-3"
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">
                    {item.priority.toUpperCase()} - {item.type}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {key !== 'assigned' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void updateStatus(item, 'assigned')}
                        disabled={!canManageWorkOrders}
                        aria-label={
                          canManageWorkOrders
                            ? 'Set assigned'
                            : 'Set assigned disabled - insufficient permissions'
                        }
                      >
                        Set Assigned
                      </Button>
                    ) : null}
                    {key !== 'in_progress' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void updateStatus(item, 'in_progress')}
                        disabled={!canManageWorkOrders}
                        aria-label={canManageWorkOrders ? 'Start work order' : 'Start disabled - insufficient permissions'}
                      >
                        Start
                      </Button>
                    ) : null}
                    {key !== 'completed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void updateStatus(item, 'completed')}
                        disabled={!canManageWorkOrders}
                        aria-label={
                          canManageWorkOrders
                            ? 'Complete work order'
                            : 'Complete disabled - insufficient permissions'
                        }
                      >
                        Complete
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}


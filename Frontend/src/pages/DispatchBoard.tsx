/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { SectionHeader } from '@/components/ui';
import http from '@/lib/http';
import { useToast } from '@/context/ToastContext';
import { useScopeContext } from '@/context/ScopeContext';
import { usePermissions } from '@/auth/usePermissions';
import type { WorkOrder } from '@/types';
type DispatchShift = 'day' | 'swing' | 'night';
type ViewMode = 'day' | 'week';

type DispatchTechnician = {
  id: string;
  name: string;
  skills: string[];
  shift: DispatchShift;
  weeklyCapacityHours: number;
  siteId?: string;
};

type CapacityRow = {
  technicianId: string;
  technicianName: string;
  shift: DispatchShift;
  capacityHours: number;
  assignedHours: number;
  utilization: number;
  overCapacity: boolean;
};

type DispatchBulkAction = 'reassign' | 'move' | 'swap';

const unwrap = <T,>(value: any): T => (value?.data?.data ?? value?.data ?? value) as T;

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const toDateInputValue = (value: Date) => {
  const copy = new Date(value);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const dayKey = (value: Date | string | undefined) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return toDateInputValue(date);
};

export default function DispatchBoard() {
  const { addToast } = useToast();
  const { activeTenant, activePlant } = useScopeContext();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<DispatchTechnician[]>([]);
  const [capacityRows, setCapacityRows] = useState<CapacityRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState<string>(toDateInputValue(new Date()));
  const [shiftFilter, setShiftFilter] = useState<DispatchShift | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<DispatchBulkAction>('reassign');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkDate, setBulkDate] = useState<string>(toDateInputValue(new Date()));
  const [bulkShift, setBulkShift] = useState<DispatchShift>('day');

  const canManageWorkOrders = can('workorders', 'write');
  const selectedDate = useMemo(() => {
    const parsed = new Date(anchorDate);
    return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
  }, [anchorDate]);

  const columns = useMemo(() => {
    if (viewMode === 'day') return [selectedDate];
    const start = startOfDay(selectedDate);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [selectedDate, viewMode]);

  const range = useMemo(() => {
    const from = columns[0];
    const to = new Date(columns[columns.length - 1]);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }, [columns]);

  const loadWorkOrders = useCallback(async () => {
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
    void loadWorkOrders();
  }, [loadWorkOrders]);

  const loadTechnicians = useCallback(async () => {
    try {
      const response = await http.get('/workorders/dispatch/technicians');
      const data = unwrap<DispatchTechnician[]>(response);
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      addToast('Unable to load technicians for dispatch.', 'error');
    }
  }, [addToast]);

  const loadCapacity = useCallback(async () => {
    try {
      const response = await http.get('/workorders/dispatch/capacity', {
        params: {
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          ...(shiftFilter !== 'all' ? { shift: shiftFilter } : {}),
        },
      });
      const data = unwrap<CapacityRow[]>(response);
      setCapacityRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      addToast('Unable to load workload balancing panel.', 'error');
    }
  }, [addToast, range.from, range.to, shiftFilter]);

  useEffect(() => {
    void loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    void loadCapacity();
  }, [loadCapacity]);

  const visibleTechnicians = useMemo(
    () =>
      technicians.filter(
        (technician) =>
          (shiftFilter === 'all' || technician.shift === shiftFilter) &&
          (siteFilter === 'all' || technician.siteId === siteFilter),
      ),
    [siteFilter, shiftFilter, technicians],
  );

  const siteOptions = useMemo(
    () =>
      Array.from(
        new Set(technicians.map((technician) => technician.siteId).filter(Boolean) as string[]),
      ),
    [technicians],
  );

  const scheduledByCell = useMemo(() => {
    const map = new Map<string, WorkOrder[]>();
    for (const workOrder of workOrders) {
      const assignee = workOrder.assignedTo ?? workOrder.assignees?.[0];
      const start = workOrder.plannedStart;
      if (!assignee || !start) continue;
      const key = `${assignee}:${dayKey(start)}`;
      const current = map.get(key) ?? [];
      current.push(workOrder);
      map.set(key, current);
    }
    return map;
  }, [workOrders]);

  const unscheduled = useMemo(
    () =>
      workOrders.filter((workOrder) => {
        if (!workOrder.plannedStart) return true;
        const assignee = workOrder.assignedTo ?? workOrder.assignees?.[0];
        return !assignee;
      }),
    [workOrders],
  );

  const toggleSelection = (workOrderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(workOrderId) ? prev.filter((id) => id !== workOrderId) : [...prev, workOrderId],
    );
  };

  const scheduleWorkOrder = async (workOrderId: string, assigneeId: string, date: Date) => {
    if (!canManageWorkOrders) return;
    const target = workOrders.find((item) => item.id === workOrderId);
    if (!target) return;
    const technician = technicians.find((item) => item.id === assigneeId);
    if (!technician) return;

    const start = new Date(date);
    const existingStart = target.plannedStart ? new Date(target.plannedStart) : null;
    if (existingStart && !Number.isNaN(existingStart.getTime())) {
      start.setHours(existingStart.getHours(), existingStart.getMinutes(), 0, 0);
    } else {
      start.setHours(8, 0, 0, 0);
    }

    const existingEnd = target.plannedEnd ? new Date(target.plannedEnd) : null;
    const defaultDurationMs = 2 * 60 * 60 * 1000;
    const durationMs =
      existingStart && existingEnd && !Number.isNaN(existingEnd.getTime()) && existingEnd > existingStart
        ? existingEnd.getTime() - existingStart.getTime()
        : defaultDurationMs;
    const end = new Date(start.getTime() + durationMs);

    const missingSkills = (target.requiredSkills ?? []).filter((skill) => !technician.skills.includes(skill));
    if (missingSkills.length) {
      try {
        const result = await http.post('/workorders/dispatch/validate-assignment', {
          workOrderId,
          technicianId: assigneeId,
        });
        const validation = unwrap<{ isQualified: boolean; missingSkills: string[] }>(result);
        if (!validation.isQualified) {
          const proceed = window.confirm(
            `Technician is missing required skills: ${validation.missingSkills.join(', ')}. Continue anyway?`,
          );
          if (!proceed) return;
        }
      } catch {
        const proceed = window.confirm(
          `Technician may be unqualified for ${target.title}. Continue with assignment?`,
        );
        if (!proceed) return;
      }
    }

    const previous = target;
    const optimistic: WorkOrder = {
      ...target,
      assignedTo: assigneeId,
      assignees: [assigneeId],
      plannedStart: start.toISOString(),
      plannedEnd: end.toISOString(),
      plannedShift: technician.shift,
      status: target.status === 'requested' || target.status === 'draft' ? 'assigned' : target.status,
    };
    setWorkOrders((prev) => prev.map((row) => (row.id === workOrderId ? optimistic : row)));

    try {
      const response = await http.patch(`/workorders/${workOrderId}/schedule`, {
        assigneeId,
        plannedStart: start.toISOString(),
        plannedEnd: end.toISOString(),
        plannedShift: technician.shift,
      });
      const payload = unwrap<{ workOrder?: WorkOrder }>(response);
      if (payload?.workOrder) {
        setWorkOrders((prev) => prev.map((row) => (row.id === workOrderId ? { ...row, ...payload.workOrder } : row)));
      }
      addToast('Work order scheduled.', 'success');
      void loadCapacity();
    } catch (error) {
      console.error(error);
      setWorkOrders((prev) => prev.map((row) => (row.id === workOrderId ? previous : row)));
      addToast('Unable to update schedule.', 'error');
    }
  };

  const onCardDragStart = (event: DragEvent<HTMLDivElement>, workOrderId: string) => {
    event.dataTransfer.setData('text/work-order-id', workOrderId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDropToCell = (event: DragEvent<HTMLDivElement>, assigneeId: string, date: Date) => {
    event.preventDefault();
    const workOrderId = event.dataTransfer.getData('text/work-order-id');
    if (!workOrderId) return;
    void scheduleWorkOrder(workOrderId, assigneeId, date);
  };

  const runBulkAction = async () => {
    if (!canManageWorkOrders || selectedIds.length === 0) return;
    if (bulkAction === 'reassign' && !bulkAssignee) {
      addToast('Choose a technician for reassignment.', 'error');
      return;
    }
    if (bulkAction === 'swap' && selectedIds.length !== 2) {
      addToast('Swap requires exactly 2 selected work orders.', 'error');
      return;
    }
    try {
      await http.post('/workorders/dispatch/bulk-update', {
        workOrderIds: selectedIds,
        action: bulkAction,
        payload:
          bulkAction === 'reassign'
            ? { assigneeId: bulkAssignee }
            : bulkAction === 'move'
              ? { date: new Date(bulkDate).toISOString(), shift: bulkShift }
              : {},
      });
      addToast('Dispatch quick action completed.', 'success');
      setSelectedIds([]);
      await Promise.all([loadWorkOrders(), loadCapacity()]);
    } catch (error) {
      console.error(error);
      addToast('Bulk dispatch action failed.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Dispatch Board"
        subtitle="Planner view with scheduling, qualification warnings, workload balancing, and quick actions."
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Tenant: {activeTenant?.name ?? 'All tenants'}
        </span>
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Site: {activePlant?.name ?? 'All sites'}
        </span>
      </div>
      <Card>
        <Card.Content className="grid gap-3 lg:grid-cols-[auto,auto,auto,auto]">
          <label className="text-sm">
            View
            <select
              className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as ViewMode)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </label>
          <label className="text-sm">
            Anchor date
            <input
              type="date"
              className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
              value={anchorDate}
              onChange={(event) => setAnchorDate(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Shift filter
            <select
              className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value as DispatchShift | 'all')}
            >
              <option value="all">All shifts</option>
              <option value="day">Day</option>
              <option value="swing">Swing</option>
              <option value="night">Night</option>
            </select>
          </label>
          <label className="text-sm">
            Site filter
            <select
              className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
              value={siteFilter}
              onChange={(event) => setSiteFilter(event.target.value)}
            >
              <option value="all">All sites</option>
              {siteOptions.map((siteId) => (
                <option key={siteId} value={siteId}>
                  {siteId}
                </option>
              ))}
            </select>
          </label>
        </Card.Content>
      </Card>

      <Card title="Dispatch Quick Actions" subtitle="Reassign, move, or swap selected work orders with audit logging.">
        <Card.Content className="grid gap-3 lg:grid-cols-[auto,1fr,1fr,auto]">
          <label className="text-sm">
            Action
            <select
              className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value as DispatchBulkAction)}
            >
              <option value="reassign">Reassign</option>
              <option value="move">Move</option>
              <option value="swap">Swap</option>
            </select>
          </label>

          {bulkAction === 'reassign' ? (
            <label className="text-sm">
              Technician
              <select
                className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
                value={bulkAssignee}
                onChange={(event) => setBulkAssignee(event.target.value)}
              >
                <option value="">Select technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm">
              Move date
              <input
                type="date"
                className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
                value={bulkDate}
                onChange={(event) => setBulkDate(event.target.value)}
              />
            </label>
          )}

          {bulkAction === 'move' ? (
            <label className="text-sm">
              Shift
              <select
                className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2"
                value={bulkShift}
                onChange={(event) => setBulkShift(event.target.value as DispatchShift)}
              >
                <option value="day">Day</option>
                <option value="swing">Swing</option>
                <option value="night">Night</option>
              </select>
            </label>
          ) : (
            <div className="self-end text-sm text-[var(--wp-color-text-muted)]">
              {selectedIds.length} selected
            </div>
          )}

          <Button
            onClick={() => void runBulkAction()}
            disabled={!canManageWorkOrders || selectedIds.length === 0}
            aria-label="Run dispatch bulk action"
          >
            Run action
          </Button>
        </Card.Content>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2.2fr,1fr]">
        <Card title="Planner Calendar" subtitle="Drag work orders onto a technician/day slot to schedule instantly.">
          <Card.Content className="space-y-3 overflow-x-auto">
            {loading ? <p className="text-sm text-[var(--wp-color-text-muted)]">Loading planner...</p> : null}
            <div className="min-w-[860px] space-y-3">
              <div
                className="grid gap-2 text-xs font-semibold text-[var(--wp-color-text-muted)]"
                style={{ gridTemplateColumns: `220px repeat(${columns.length}, minmax(88px, 1fr))` }}
              >
                <div>Technician</div>
                {columns.map((column) => (
                  <div key={column.toISOString()}>{column.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                ))}
              </div>

              {visibleTechnicians.map((technician) => (
                <div
                  key={technician.id}
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `220px repeat(${columns.length}, minmax(88px, 1fr))` }}
                >
                  <div className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-2">
                    <div className="text-sm font-semibold">{technician.name}</div>
                    <div className="text-xs text-[var(--wp-color-text-muted)]">
                      {technician.shift} shift
                    </div>
                    <div className="mt-1 text-xs text-[var(--wp-color-text-muted)]">
                      Skills: {technician.skills.length ? technician.skills.join(', ') : 'None'}
                    </div>
                  </div>
                  {columns.map((column) => {
                    const key = `${technician.id}:${dayKey(column)}`;
                    const rows = scheduledByCell.get(key) ?? [];
                    return (
                      <div
                        key={`${technician.id}-${column.toISOString()}`}
                        className="min-h-[92px] rounded-md border border-dashed border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => onDropToCell(event, technician.id, column)}
                      >
                        {rows.map((item) => (
                          <div
                            key={item.id}
                            draggable={canManageWorkOrders}
                            onDragStart={(event) => onCardDragStart(event, item.id)}
                            className="mb-2 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-2 text-xs"
                          >
                            <label className="mb-1 flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleSelection(item.id)}
                              />
                              <span className="font-semibold">{item.title}</span>
                            </label>
                            <p className="text-[var(--wp-color-text-muted)]">
                              {item.priority.toUpperCase()} · {item.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        <div className="space-y-4">
          <Card title="Unscheduled Work" subtitle="Drag these cards onto a technician slot.">
            <Card.Content className="space-y-2">
              {unscheduled.map((item) => (
                <div
                  key={item.id}
                  draggable={canManageWorkOrders}
                  onDragStart={(event) => onCardDragStart(event, item.id)}
                  className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-2 text-sm"
                >
                  <label className="mb-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                    />
                    <span className="font-semibold">{item.title}</span>
                  </label>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">
                    {item.priority.toUpperCase()} · {item.type}
                  </p>
                  {(item.requiredSkills?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-xs text-amber-500">
                      Required skills: {item.requiredSkills?.join(', ')}
                    </p>
                  ) : null}
                </div>
              ))}
              {!unscheduled.length ? (
                <p className="text-sm text-[var(--wp-color-text-muted)]">All loaded work orders are scheduled.</p>
              ) : null}
            </Card.Content>
          </Card>

          <Card title="Workload Balancing" subtitle="Capacity vs assigned hours by technician.">
            <Card.Content className="space-y-2">
              {capacityRows
                .filter(
                  (row) =>
                    (shiftFilter === 'all' || row.shift === shiftFilter) &&
                    (siteFilter === 'all' ||
                      (technicians.find((item) => item.id === row.technicianId)?.siteId ?? '') === siteFilter),
                )
                .map((row) => (
                  <div
                    key={row.technicianId}
                    className={`rounded-md border p-2 ${row.overCapacity
                        ? 'border-rose-400 bg-rose-500/10'
                        : 'border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)]'
                      }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{row.technicianName}</span>
                      <span className={row.overCapacity ? 'text-rose-400' : 'text-[var(--wp-color-text-muted)]'}>
                        {row.utilization}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--wp-color-text-muted)]">
                      {row.assignedHours}h assigned / {row.capacityHours}h capacity
                    </p>
                  </div>
                ))}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}



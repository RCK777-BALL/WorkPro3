/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import http from '@/lib/http';
import {
  addToQueue,
  enqueueWorkOrderUpdate,
  type SyncConflict,
} from '@/utils/offlineQueue';
import ConflictResolver from '@/components/offline/ConflictResolver';
import WorkOrderQueuePanel from '@/components/offline/WorkOrderQueuePanel';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Scan, Search } from 'lucide-react';
import TableLayoutControls from '@/components/common/TableLayoutControls';
import NewWorkOrderModal from '@/components/work-orders/NewWorkOrderModal';
import WorkOrderReviewModal from '@/components/work-orders/WorkOrderReviewModal';
import WorkOrderMobileCard from '@/components/work-orders/WorkOrderMobileCard';
import { Card, EmptyState, FilterBar, FormField, SectionHeader, StatusPill, UiDataTable } from '@/components/ui';
import type { WorkOrder } from '@/types';
import { mapChecklistsFromApi, mapSignaturesFromApi } from '@/utils/workOrderTransforms';
import { useTableLayout } from '@/hooks/useTableLayout';
import { useAuth } from '@/context/AuthContext';
import { loadWorkOrderCache, saveWorkOrderCache } from '@/hooks/useWorkOrderCache';
import { useSyncStore } from '@/store/syncStore';

const OPTIONAL_WORK_ORDER_KEYS: (keyof WorkOrder)[] = [
  'description',
  'assetId',
  'asset',
  'copilotSummary',
  'copilotSummaryUpdatedAt',
  'failureModeTags',
  'complianceProcedureId',
  'calibrationIntervalDays',
  'assignedTo',
  'assignedToAvatar',
  'assignees',
  'checklists',
  'partsUsed',
  'signatures',
  'timeSpentMin',
  'photos',
  'failureCode',
  'permits',
  'requiredPermitTypes',
  'scheduledDate',
  'dueDate',
  'createdAt',
  'completedAt',
  'note',
  'completedBy',
  'attachments',
  'parts',
  'checklistHistory',
  'checklistCompliance',
];

type WorkOrderResponse = Partial<WorkOrder> & { _id?: string; id?: string };

const normalizeWorkOrder = (
  raw: WorkOrderResponse | null | undefined,
  fallback?: WorkOrder,
): WorkOrder | null => {
  if (!raw && !fallback) {
    return null;
  }

  const resolved = raw ?? {};
  const id = resolved._id ?? resolved.id ?? fallback?.id;
  if (!id) {
    return null;
  }

  const normalized: WorkOrder = {
    id,
    tenantId: resolved.tenantId ?? fallback?.tenantId ?? 'unknown-tenant',
    title: resolved.title ?? fallback?.title ?? 'Untitled Work Order',
    priority: resolved.priority ?? fallback?.priority ?? 'medium',
    status: resolved.status ?? fallback?.status ?? 'requested',
    type: resolved.type ?? fallback?.type ?? 'corrective',
    department: resolved.department ?? fallback?.department ?? 'General',
  };

  OPTIONAL_WORK_ORDER_KEYS.forEach((key) => {
    const value = resolved[key] ?? fallback?.[key];
    assignIfDefined(normalized, key, value as WorkOrder[typeof key] | undefined);
  });

  return normalized;
};

function assignIfDefined<T, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
  if (value !== undefined) {
    target[key] = value;
  }
}

export default function WorkOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? '');
  const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get('priority') ?? '');
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') ?? '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const conflict = useSyncStore((state) => state.conflict) as SyncConflict | null;
  const setConflict = useSyncStore((state) => state.setConflict);

  const columnMetadata = useMemo(
    () => [
      { id: 'title', label: 'Title' },
      { id: 'priority', label: 'Priority' },
      { id: 'status', label: 'Status' },
      { id: 'assignees', label: 'Assignees' },
      { id: 'dueDate', label: 'Due Date' },
      { id: 'actions', label: 'Actions' },
    ],
    [],
  );
  const tableColumnIds = useMemo(() => columnMetadata.map((col) => col.id), [columnMetadata]);

  const currentFilters = useMemo(
    () => ({
      search,
      status: statusFilter,
      priority: priorityFilter,
      startDate,
      endDate,
    }),
    [endDate, priorityFilter, search, startDate, statusFilter],
  );

  const tableLayout = useTableLayout({
    tableKey: 'workorders-table',
    columnIds: tableColumnIds,
    userId: user?.id,
    defaultFilters: currentFilters,
  });
  const applySharedLayoutState = tableLayout.applySharedLayout;
  const updateLayoutFilters = tableLayout.updateFilters;

  const applyLayoutFilters = useCallback(
    (filters?: Record<string, string>) => {
      if (!filters) return;

      setSearch(filters.search ?? '');
      setStatusFilter(filters.status ?? '');
      setPriorityFilter(filters.priority ?? '');
      setStartDate(filters.startDate ?? '');
      setEndDate(filters.endDate ?? '');

      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      setSearchParams(params);
    },
    [setSearchParams],
  );

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return;
    if (choice === 'local') {
      const payload = {
        ...(conflict.local as Record<string, unknown>),
        clientUpdatedAt: new Date().toISOString(),
      };
      await http({
        method: conflict.method,
        url: conflict.url,
        data: payload,
      });
    }
    setConflict(null);
  };

  useEffect(() => {
    updateLayoutFilters(currentFilters);
  }, [currentFilters, updateLayoutFilters]);

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const sharedLayout = params.get('layout');
    if (!sharedLayout) return;

    const applied = applySharedLayoutState(sharedLayout);
    if (applied?.filters) {
      applyLayoutFilters(applied.filters);
    }
  }, [applyLayoutFilters, applySharedLayoutState, searchKey]);

  const fetchWorkOrders = useCallback(
    async (
      filters?: {
        status?: string | undefined;
        priority?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
      },
    ) => {
      if (!navigator.onLine) {
        const cached = await loadWorkOrderCache();
        if (cached.length > 0) {
          setWorkOrders(cached);
          setError('You are offline. Showing cached work orders.');
        } else {
          setError('You are offline. No cached work orders available.');
        }
        return;
      }
      try {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.status) params.append('status', filters.status);
          if (filters.priority) params.append('priority', filters.priority);
          if (filters.startDate) params.append('startDate', filters.startDate);
          if (filters.endDate) params.append('endDate', filters.endDate);
        }
        const url = params.toString()
          ? `/workorders/search?${params.toString()}`
          : '/workorders';
        const res = await http.get<WorkOrderResponse[]>(url);
        const normalized: WorkOrder[] = Array.isArray(res.data)
          ? res.data.flatMap((item) => {
              const workOrder = normalizeWorkOrder(item);
              return workOrder ? [workOrder] : [];
            })
          : [];
        setWorkOrders(normalized);
        await saveWorkOrderCache(normalized);
        setError(null);
      } catch (err) {
        console.error(err);
        const cached = await loadWorkOrderCache();
        if (cached.length > 0) {
          setWorkOrders(cached);
          setError('Unable to fetch latest work orders. Showing cached data.');
        } else {
          setError('Failed to load work orders.');
        }
      }
    },
    [],
  );

  const updateStatus = async (
    id: string,
    status: WorkOrder['status'] = 'completed'
  ) => {
    const update = { status };
    if (!navigator.onLine) {
      enqueueWorkOrderUpdate(id, update);
      const updated = workOrders.map((wo) =>
        wo.id === id ? { ...wo, status } : wo
      );
      setWorkOrders(updated);
      await saveWorkOrderCache(updated);
      return;
    }
    try {
      await http.put(`/workorders/${id}`, update);
      fetchWorkOrders();
    } catch {
      enqueueWorkOrderUpdate(id, update);
    }
  };

  const transition = async (id: string, action: 'assign' | 'start' | 'complete' | 'cancel') => {
    try {
      await http.post(`/workorders/${id}/${action}`);
      fetchWorkOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleWorkOrderChange = useCallback((updated: WorkOrder) => {
    setSelectedOrder(updated);
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === updated.id ? { ...wo, ...updated } : wo)),
    );
  }, []);

  const openReview = async (order: WorkOrder) => {
    try {
      const res = await http.get<WorkOrderResponse>(`/workorders/${order.id}`);
      const normalized = normalizeWorkOrder(res.data, order);
      if (normalized) {
        setSelectedOrder(normalized);
        setShowReviewModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveWorkOrder = async (
    payload: FormData | Record<string, unknown>,
    existingId?: string,
  ) => {
    const isEdit = Boolean(existingId);

    if (!navigator.onLine) {
      if (payload instanceof FormData) {
        console.warn('Cannot queue multipart payloads while offline.');
        return;
      }

      const queueAction =
        isEdit && existingId
          ? () => enqueueWorkOrderUpdate(existingId, payload as Record<string, unknown>)
          : () =>
              addToQueue({
                method: 'post',
                url: '/workorders',
                data: payload,
                meta: { entityType: 'workorder', description: 'Create work order' },
              });
      queueAction();

      setWorkOrders((prev) => {
          const recordPayload = payload as unknown as Partial<WorkOrder> & {
            departmentId?: string;
            checklists?: unknown;
            signatures?: unknown;
          } & Record<string, unknown>;
          if (isEdit && existingId) {
            const updated = prev.map((wo) => {
              if (wo.id !== existingId) {
                return wo;
              }
              const { departmentId, checklists, signatures, ...restPayload } = recordPayload;
              const departmentValue = (recordPayload.department as string)
                ?? departmentId
                ?? wo.department;
              const merged: WorkOrder = {
                ...wo,
                ...restPayload,
                department: departmentValue,
              } as WorkOrder;
              if (checklists !== undefined) {
                merged.checklists = mapChecklistsFromApi(checklists);
              }
              if (signatures !== undefined) {
                merged.signatures = mapSignaturesFromApi(signatures);
              }
              return merged;
            });
            void saveWorkOrderCache(updated);
            return updated;
          }

          const { departmentId, checklists, signatures } = recordPayload;
          const departmentValue = (recordPayload.department as string) ?? departmentId ?? 'General';

          const temp: WorkOrder = {
            id: Date.now().toString(),
            title: (recordPayload.title as string) ?? 'Untitled Work Order',
            priority: (recordPayload.priority as WorkOrder['priority']) ?? 'medium',
            status: (recordPayload.status as WorkOrder['status']) ?? 'requested',
            type: (recordPayload.type as WorkOrder['type']) ?? 'corrective',
            department: departmentValue,
          } as WorkOrder;

          OPTIONAL_WORK_ORDER_KEYS.forEach((key) => {
            const value = (recordPayload as Record<string, unknown>)[key as string];
            assignIfDefined(temp, key, value as WorkOrder[typeof key] | undefined);
          });
          if (checklists !== undefined) {
            temp.checklists = mapChecklistsFromApi(checklists);
          }
          if (signatures !== undefined) {
            temp.signatures = mapSignaturesFromApi(signatures);
          }

        const updated = [...prev, temp];
        void saveWorkOrderCache(updated);
        return updated;
      });
      return;
    }

    try {
      if (payload instanceof FormData) {
        const config = { headers: { 'Content-Type': 'multipart/form-data' } } as const;
        if (isEdit && existingId) {
          await http.put(`/workorders/${existingId}`, payload, config);
        } else {
          await http.post('/workorders', payload, config);
        }
      } else if (isEdit && existingId) {
        await http.put(`/workorders/${existingId}`, payload);
      } else {
        await http.post('/workorders', payload);
      }
      fetchWorkOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWorkOrder = async (id: string) => {
    if (!navigator.onLine) {
      addToQueue({
        method: 'delete',
        url: `/workorders/${id}`,
        meta: { entityType: 'workorder', entityId: id, description: 'Delete work order' },
      });
      setWorkOrders((prev) => {
        const updated = prev.filter((wo) => wo.id !== id);
        void saveWorkOrderCache(updated);
        return updated;
      });
      return;
    }

    try {
      await http.delete(`/workorders/${id}`);
      fetchWorkOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (order: WorkOrder) => {
    if (!navigator.onLine) {
      setEditingOrder(order);
      setIsModalOpen(true);
      return;
    }

    try {
      const res = await http.get<WorkOrderResponse>(`/workorders/${order.id}`);
      const normalized = normalizeWorkOrder(res.data, order);
      setEditingOrder(normalized ?? order);
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const statusParam = params.get('status') ?? '';
    const priorityParam = params.get('priority') ?? '';
    const startParam = params.get('startDate') ?? '';
    const endParam = params.get('endDate') ?? '';

    setStatusFilter((prev) => (prev === statusParam ? prev : statusParam));
    setPriorityFilter((prev) => (prev === priorityParam ? prev : priorityParam));
    setStartDate((prev) => (prev === startParam ? prev : startParam));
    setEndDate((prev) => (prev === endParam ? prev : endParam));

    fetchWorkOrders({
      status: statusParam || undefined,
      priority: priorityParam || undefined,
      startDate: startParam || undefined,
      endDate: endParam || undefined,
    });
  }, [fetchWorkOrders, searchKey]);

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch = Object.values(wo).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase()),
    );
    const matchesStatus = !statusFilter || wo.status === statusFilter;
    const matchesPriority = !priorityFilter || wo.priority === priorityFilter;

    const compareDate = wo.dueDate ?? wo.scheduledDate ?? wo.createdAt;
    const compareTime = compareDate ? new Date(compareDate).getTime() : null;
    const startTime = startDate ? new Date(startDate).getTime() : null;
    const endTime = endDate ? new Date(endDate).getTime() : null;
    const matchesStart = startTime === null || (compareTime !== null && compareTime >= startTime);
    const matchesEnd = endTime === null || (compareTime !== null && compareTime <= endTime);

    return matchesSearch && matchesStatus && matchesPriority && matchesStart && matchesEnd;
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const next = params.toString();
    if (next === searchKey) {
      fetchWorkOrders({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } else {
      setSearchParams(params);
    }
  };
  const columns = useMemo(
    () => [
      { id: 'title', header: 'Title', accessor: 'title' as keyof WorkOrder },
      {
        id: 'priority',
        header: 'Priority',
        accessor: (row: WorkOrder) => (
          <Badge text={row.priority} type="priority" size="sm" />
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (row: WorkOrder) => (
          <StatusPill value={row.status} />
        ),
      },
      {
        id: 'assignees',
        header: 'Assignees',
        accessor: (row: WorkOrder) => row.assignees?.join(', ') || 'N/A',
      },
      {
        id: 'dueDate',
        header: 'Due Date',
        accessor: (row: WorkOrder) =>
          row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A',
      },
      {
        id: 'actions',
        header: 'Actions',
        accessor: (row: WorkOrder) => {
          const handleTransition = (
            event: MouseEvent<HTMLButtonElement>,
            action: 'assign' | 'start' | 'complete' | 'cancel',
          ) => {
            event.stopPropagation();
            transition(row.id, action);
          };

          const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            openEditModal(row);
          };

          const handleView = (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            openReview(row);
          };

          const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            if (window.confirm('Are you sure you want to delete this work order?')) {
              deleteWorkOrder(row.id);
            }
          };

          switch (row.status) {
            case 'requested':
              return (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleView}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'assign')}
                  >
                    Assign
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              );
            case 'assigned':
              return (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleView}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'start')}
                  >
                    Start
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              );
            case 'in_progress':
              return (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleView}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'complete')}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'cancel')}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              );
            case 'paused':
              return (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleView}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'start')}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'complete')}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => handleTransition(event, 'cancel')}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              );
            default:
              return (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleView}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              );
          }
        },
        className: 'text-right',
      },
    ],
    [deleteWorkOrder, openEditModal, openReview, transition],
  );

  const columnLookup = useMemo(
    () => new Map(columns.map((column) => [column.id ?? column.header, column])),
    [columns],
  );

  const visibleColumns = useMemo(
    () =>
      tableLayout.visibleColumnOrder
        .map((id) => columnLookup.get(id))
        .filter(Boolean) as typeof columns,
    [columnLookup, tableLayout.visibleColumnOrder],
  );

  const handleApplySavedLayout = (layoutId: string) => {
    const applied = tableLayout.applyLayout(layoutId);
    if (applied?.filters) {
      applyLayoutFilters(applied.filters);
    }
  };

  const handleSaveLayout = (name: string) =>
    tableLayout.saveLayout(name, {
      ...currentFilters,
    });

  const shareLayoutLink = (layoutId?: string) => {
    const targetState = layoutId
      ? tableLayout.savedLayouts.find((layout) => layout.id === layoutId)?.state
      : tableLayout.preferences;
    return tableLayout.getShareableLink(targetState ?? tableLayout.preferences);
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <SectionHeader
          title="Work Orders"
          subtitle="Mobile-ready list of active and offline work orders."
          actions={
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => navigate('/assets/scan')}
              >
                <Scan className="mr-2 h-5 w-5" />
                Scan QR/Barcode
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={openCreateModal}
                className="w-full border border-primary-700 sm:w-auto"
              >
                Create Work Order
              </Button>
            </>
          }
        />

        <WorkOrderQueuePanel />

        {error && <p className="text-red-600">{error}</p>}

        <Card className="p-4">
          <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Search className="text-neutral-500" size={20} />
            <input
              type="text"
              placeholder="Search work orders..."
              className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400 dark:text-neutral-100"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        <FilterBar className="lg:grid-cols-[1.2fr,1fr,1fr,1fr]">
          <FormField label="Status">
            <select
              className="w-full rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
          <FormField label="Priority">
            <select
              className="w-full rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              value={priorityFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </FormField>
          <FormField label="Start date">
            <input
              type="date"
              className="w-full rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="End date">
            <input
              type="date"
              className="w-full rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            />
          </FormField>
          <Button variant="secondary" onClick={applyFilters}>
            Apply filters
          </Button>
        </FilterBar>

        <TableLayoutControls
          columns={columnMetadata}
          columnOrder={tableLayout.columnOrder}
          hiddenColumns={tableLayout.hiddenColumns}
          onToggleColumn={tableLayout.toggleColumn}
          onMoveColumn={tableLayout.moveColumn}
          onReset={tableLayout.resetLayout}
          onSaveLayout={handleSaveLayout}
          savedLayouts={tableLayout.savedLayouts}
          onApplyLayout={handleApplySavedLayout}
          onShareLayout={shareLayoutLink}
          activeLayoutId={tableLayout.activeLayoutId}
        />

        <div className="space-y-3 sm:hidden">
          {filteredOrders.map((order) => (
            <WorkOrderMobileCard
              key={order.id}
              order={order}
              onView={() => openReview(order)}
              onEdit={() => openEditModal(order)}
              onDelete={() => {
                if (window.confirm('Are you sure you want to delete this work order?')) {
                  deleteWorkOrder(order.id);
                }
              }}
              onTransition={(action) => transition(order.id, action)}
            />
          ))}
          {filteredOrders.length === 0 && (
            <p className="rounded-lg border border-dashed border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
              No work orders available.
            </p>
          )}
        </div>

        <div className="hidden sm:block">
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="No work orders found"
              description="Try adjusting filters or create a new work order."
              action={
                <Button variant="primary" onClick={openCreateModal}>
                  Create Work Order
                </Button>
              }
            />
          ) : (
            <UiDataTable<WorkOrder>
              title="Work Orders"
              columns={visibleColumns}
              data={filteredOrders}
              keyField="id"
              stickyHeader
              onRowClick={openReview}
            />
          )}
        </div>
        <NewWorkOrderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingOrder(null);
          }}
          workOrder={editingOrder}
          onUpdate={async (payload) => {
            await saveWorkOrder(payload, editingOrder?.id);
            setIsModalOpen(false);
            setEditingOrder(null);
          }}
        />
        <WorkOrderReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedOrder(null);
          }}
          workOrder={selectedOrder}
          onUpdateStatus={async (status) => {
            if (selectedOrder) {
              await updateStatus(selectedOrder.id, status);
              fetchWorkOrders();
            }
            setShowReviewModal(false);
            setSelectedOrder(null);
          }}
          onWorkOrderChange={handleWorkOrderChange}
        />
      </div>
      <ConflictResolver
        conflict={conflict}
        onResolve={resolveConflict}
        onClose={() => setConflict(null)}
      />
    </>
  );
}

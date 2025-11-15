/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import http from '@/lib/http';
import { addToQueue, onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';
import ConflictResolver from '@/components/offline/ConflictResolver';
import DataTable from '@/components/common/DataTable';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Search } from 'lucide-react';
import NewWorkOrderModal from '@/components/work-orders/NewWorkOrderModal';
import WorkOrderReviewModal from '@/components/work-orders/WorkOrderReviewModal';
import type { WorkOrder } from '@/types';
import { mapChecklistsFromApi, mapSignaturesFromApi } from '@/utils/workOrderTransforms';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const LOCAL_KEY = 'offline-workorders';
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
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  useEffect(() => {
    const unsub = onSyncConflict(setConflict);
    return () => {
      unsub();
    };
  }, []);

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return;
    if (choice === 'local') {
      await http({
        method: conflict.method,
        url: conflict.url,
        data: conflict.local,
      });
    }
    setConflict(null);
  };

  const fetchWorkOrders = useCallback(
    async (
      filters?: { status?: string; priority?: string; startDate?: string; endDate?: string },
    ) => {
      if (!navigator.onLine) {
        const cached = safeLocalStorage.getItem(LOCAL_KEY);
        if (cached) {
          setWorkOrders(JSON.parse(cached));
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
        safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));
        setError(null);
      } catch (err) {
        console.error(err);
        const cached = safeLocalStorage.getItem(LOCAL_KEY);
        if (cached) {
          setWorkOrders(JSON.parse(cached));
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
      addToQueue({ method: 'put', url: `/workorders/${id}`, data: update });
      const updated = workOrders.map((wo) =>
        wo.id === id ? { ...wo, status } : wo
      );
      setWorkOrders(updated);
      safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      return;
    }
    try {
      await http.put(`/workorders/${id}`, update);
      fetchWorkOrders();
    } catch {
      addToQueue({ method: 'put', url: `/workorders/${id}`, data: update });
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

      addToQueue({
        method: isEdit ? 'put' : 'post',
        url: isEdit ? `/workorders/${existingId}` : '/workorders',
        data: payload,
      });

      setWorkOrders((prev) => {
        const recordPayload = payload as Record<string, unknown>;
        if (isEdit && existingId) {
          const updated = prev.map((wo) => {
            if (wo.id !== existingId) {
              return wo;
            }
            const departmentValue = (recordPayload.department as string)
              ?? (recordPayload.departmentId as string)
              ?? wo.department;
            const rawChecklists = (recordPayload as { checklists?: unknown }).checklists;
            const rawSignatures = (recordPayload as { signatures?: unknown }).signatures;
            const merged: WorkOrder = {
              ...wo,
              ...recordPayload,
              department: departmentValue,
            } as WorkOrder;
            delete (merged as Record<string, unknown>).departmentId;
            if (rawChecklists !== undefined) {
              merged.checklists = mapChecklistsFromApi(rawChecklists);
            }
            if (rawSignatures !== undefined) {
              merged.signatures = mapSignaturesFromApi(rawSignatures);
            }
            return merged;
          });
          safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
          return updated;
        }

        const departmentValue = (recordPayload.department as string)
          ?? (recordPayload.departmentId as string)
          ?? 'General';

        const temp: WorkOrder = {
          id: Date.now().toString(),
          title: (recordPayload.title as string) ?? 'Untitled Work Order',
          priority: (recordPayload.priority as WorkOrder['priority']) ?? 'medium',
          status: (recordPayload.status as WorkOrder['status']) ?? 'requested',
          type: (recordPayload.type as WorkOrder['type']) ?? 'corrective',
          department: departmentValue,
        } as WorkOrder;

        OPTIONAL_WORK_ORDER_KEYS.forEach((key) => {
          const value = recordPayload[key as string];
          assignIfDefined(temp, key, value as WorkOrder[typeof key] | undefined);
        });
        if (recordPayload.checklists !== undefined) {
          temp.checklists = mapChecklistsFromApi(recordPayload.checklists);
        }
        if (recordPayload.signatures !== undefined) {
          temp.signatures = mapSignaturesFromApi(recordPayload.signatures);
        }

        const updated = [...prev, temp];
        safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
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
      addToQueue({ method: 'delete', url: `/workorders/${id}` });
      setWorkOrders((prev) => {
        const updated = prev.filter((wo) => wo.id !== id);
        safeLocalStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
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

  const columns = [
    { header: 'Title', accessor: 'title' as keyof WorkOrder },
    {
      header: 'Priority',
      accessor: (row: WorkOrder) => (
        <Badge text={row.priority} type="priority" size="sm" />
      ),
    },
    {
      header: 'Status',
      accessor: (row: WorkOrder) => (
        <Badge text={row.status} type="status" size="sm" />
      ),
    },
    {
      header: 'Assignees',
      accessor: (row: WorkOrder) => row.assignees?.join(', ') || 'N/A',
    },
    {
      header: 'Due Date',
      accessor: (row: WorkOrder) =>
        row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'N/A',
    },
    {
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
  ];

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="border border-primary-700"
          >
            Create Work Order
          </Button>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <Search className="text-neutral-500" size={20} />
          <input
            type="text"
            placeholder="Search work orders..."
            className="flex-1 bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <select
            className="border rounded p-2 flex-1"
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
          <select
            className="border rounded p-2 flex-1"
            value={priorityFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="date"
            className="border rounded p-2"
            value={startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border rounded p-2"
            value={endDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={applyFilters}
          >
            Filter
          </Button>
        </div>

        <DataTable<WorkOrder>
          columns={columns}
          data={filteredOrders}
          keyField="id"
          onRowClick={openReview}
          emptyMessage="No work orders available."
        />
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

/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
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

const LOCAL_KEY = 'offline-workorders';
const OPTIONAL_WORK_ORDER_KEYS: (keyof WorkOrder)[] = [
  'description',
  'assetId',
  'asset',
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

export default function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const fetchWorkOrders = async (
    filters?: { status?: string; priority?: string; startDate?: string; endDate?: string }
  ) => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem(LOCAL_KEY);
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
      interface WorkOrderResponse extends Partial<WorkOrder> { _id?: string; id?: string }
      const normalize = (
        raw: WorkOrderResponse,
      ): WorkOrder | null => {
        const resolvedId = raw._id ?? raw.id;
        if (!resolvedId) {
          return null;
        }
        const normalized: WorkOrder = {
          id: resolvedId,
          title: raw.title ?? 'Untitled Work Order',
          priority: raw.priority ?? 'medium',
          status: raw.status ?? 'requested',
          type: raw.type ?? 'corrective',
          department: raw.department ?? 'General',
        };
        OPTIONAL_WORK_ORDER_KEYS.forEach((key) => {
          const value = raw[key];
          if (value !== undefined) {
            normalized[key] = value as WorkOrder[typeof key];
          }
        });
        return normalized;
      };
      const res = await http.get<WorkOrderResponse[]>(url);
      const normalized: WorkOrder[] = Array.isArray(res.data)
        ? res.data.flatMap((item) => {
            const workOrder = normalize(item);
            return workOrder ? [workOrder] : [];
          })
        : [];
      setWorkOrders(normalized);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.error(err);
      const cached = localStorage.getItem(LOCAL_KEY);
      if (cached) {
        setWorkOrders(JSON.parse(cached));
        setError('Unable to fetch latest work orders. Showing cached data.');
      } else {
        setError('Failed to load work orders.');
      }
    }
  };

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
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
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

  const openReview = async (order: WorkOrder) => {
    try {
      interface WorkOrderResponse extends Partial<WorkOrder> { _id?: string; id?: string }
      const res = await http.get<WorkOrderResponse>(`/workorders/${order.id}`);
      const normalized = ((): WorkOrder | null => {
        const resolvedId = res.data._id ?? res.data.id ?? order.id;
        const normalizedOrder: WorkOrder = {
          id: resolvedId,
          title: res.data.title ?? order.title,
          priority: res.data.priority ?? order.priority,
          status: res.data.status ?? order.status,
          type: res.data.type ?? order.type,
          department: res.data.department ?? order.department,
        };
        OPTIONAL_WORK_ORDER_KEYS.forEach((key) => {
          const value = res.data[key];
          if (value !== undefined) {
            normalizedOrder[key] = value as WorkOrder[typeof key];
          }
        });
        return normalizedOrder;
      })();
      if (normalized) {
        setSelectedOrder(normalized);
        setShowReviewModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createWorkOrder = async (payload: FormData | Record<string, unknown>) => {
    if (!navigator.onLine) {
      if (!(payload instanceof FormData)) {
        addToQueue({ method: 'post', url: '/workorders', data: payload });
        const temp = { ...payload, id: Date.now().toString() } as WorkOrder;
        setWorkOrders((prev) => [...prev, temp]);
        localStorage.setItem(LOCAL_KEY, JSON.stringify([...workOrders, temp]));
      }
      return;
    }
    try {
      if (payload instanceof FormData) {
        await http.post('/workorders', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await http.post('/workorders', payload);
      }
      fetchWorkOrders();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const filteredOrders = workOrders.filter((wo) =>
    Object.values(wo).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );

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
        switch (row.status) {
          case 'requested':
            return (
              <Button variant="ghost" size="sm" onClick={() => transition(row.id, 'assign')}>
                Assign
              </Button>
            );
          case 'assigned':
            return (
              <Button variant="ghost" size="sm" onClick={() => transition(row.id, 'start')}>
                Start
              </Button>
            );
          case 'in_progress':
            return (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => transition(row.id, 'complete')}>
                  Complete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => transition(row.id, 'cancel')}>
                  Cancel
                </Button>
              </div>
            );
          default:
            return null;
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
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
          <select
            className="border rounded p-2 flex-1"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border rounded p-2"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() =>
              fetchWorkOrders({
                status: statusFilter,
                priority: priorityFilter,
                startDate,
                endDate,
              })
            }
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
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          workOrder={null}
          onUpdate={async (payload) => {
            await createWorkOrder(payload);
            setShowCreateModal(false);
          }}
        />
        <WorkOrderReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          workOrder={selectedOrder}
          onUpdateStatus={async (status) => {
            if (selectedOrder) {
              await updateStatus(selectedOrder.id, status);
              fetchWorkOrders();
            }
            setShowReviewModal(false);
          }}
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

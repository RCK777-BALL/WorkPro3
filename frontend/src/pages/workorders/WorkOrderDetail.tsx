/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import http from '@/lib/http';
import type { WorkOrder } from '@/types';
import CommentThread from '@/components/comments/CommentThread';
import Badge from '@/components/common/Badge';

interface WorkOrderResponse extends Partial<WorkOrder> {
  _id?: string;
  id?: string;
}

const normalizeWorkOrder = (data: WorkOrderResponse): WorkOrder | null => {
  const id = data._id ?? data.id;
  if (!id) return null;
  return {
    id,
    title: data.title ?? 'Work Order',
    status: data.status ?? 'requested',
    priority: data.priority ?? 'medium',
    type: data.type ?? 'corrective',
    description: data.description,
    assetId: data.assetId,
    asset: data.asset,
    department: data.department ?? '',
  } as WorkOrder;
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await http.get<WorkOrderResponse>(`/workorders/${id}`);
        const normalized = normalizeWorkOrder(res.data);
        setWorkOrder(normalized);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Unable to load work order details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const header = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-neutral-500">Loading work order...</p>;
    }
    if (error) {
      return <p className="text-sm text-rose-500">{error}</p>;
    }
    if (!workOrder) {
      return <p className="text-sm text-neutral-500">No work order found.</p>;
    }
    return null;
  }, [loading, error, workOrder]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-300">Work order</p>
          <h1 className="text-3xl font-bold text-white">{workOrder?.title ?? 'Work order details'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-300">
            <Badge
              text={workOrder?.status ?? 'unknown'}
              color={clsx(
                workOrder?.status === 'completed' ? 'green' : undefined,
                workOrder?.status === 'in_progress' ? 'blue' : undefined,
              )}
            />
            <Badge text={workOrder?.priority ?? 'medium'} />
            {workOrder?.assetId && (
              <Link className="text-indigo-300 hover:text-indigo-200" to={`/assets/${workOrder.assetId}`}>
                View asset
              </Link>
            )}
          </div>
          {header}
        </div>
        <Link
          to="/workorders"
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
        >
          Back to list
        </Link>
      </div>

      {workOrder && (
        <div className="rounded-3xl border border-neutral-900/80 bg-neutral-950/60 p-6 text-neutral-100">
          <h2 className="text-lg font-semibold text-white">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-200">
            {workOrder.description ?? 'No description provided.'}
          </p>
        </div>
      )}

      {id ? (
        <CommentThread entityType="WO" entityId={id} />
      ) : (
        <p className="text-sm text-neutral-500">Work order id required to load comments.</p>
      )}
    </div>
  );
};

export default WorkOrderDetail;

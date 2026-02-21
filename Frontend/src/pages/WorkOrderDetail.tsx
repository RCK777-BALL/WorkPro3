import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchWorkOrderById } from '../api/endpoints/workOrders';

const WorkOrderDetail: React.FC = () => {
  const { workOrderId } = useParams();
  const [workOrder, setWorkOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!workOrderId) return;
    fetchWorkOrderById(workOrderId).then(setWorkOrder);
  }, [workOrderId]);

  if (!workOrder) {
    return <div className="text-sm text-[var(--wp-color-text-muted)]">Loading work order…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">{String(workOrder.title ?? 'Work Order')}</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">Status: {String(workOrder.status ?? 'open')}</p>
      </header>
      <section className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--wp-color-text)]">Details</h2>
        <p className="mt-2 text-sm text-[var(--wp-color-text-muted)]">{String(workOrder.description ?? 'No description')}</p>
      </section>
    </div>
  );
};

export default WorkOrderDetail;


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
    return <div className="text-sm text-neutral-500">Loading work order…</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">{String(workOrder.title ?? 'Work Order')}</h1>
        <p className="text-sm text-neutral-500">Status: {String(workOrder.status ?? 'open')}</p>
      </header>
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-700">Details</h2>
        <p className="mt-2 text-sm text-neutral-600">{String(workOrder.description ?? 'No description')}</p>
      </section>
    </div>
  );
};

export default WorkOrderDetail;

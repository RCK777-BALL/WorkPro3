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
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { usePartsQuery, useStockItemsQuery } from '@/features/inventory';
import { useToast } from '@/context/ToastContext';

interface WorkOrderResponse extends Partial<WorkOrder> {
  _id?: string;
  id?: string;
}

const normalizeWorkOrder = (data: WorkOrderResponse): WorkOrder | null => {
  const id = data._id ?? data.id;
  if (!id) return null;
  const normalized: WorkOrder = {
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

  if (data.checklistHistory) {
    normalized.checklistHistory = data.checklistHistory;
  }
  if (data.checklistCompliance) {
    normalized.checklistCompliance = data.checklistCompliance;
  }

  return normalized;
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const partsQuery = usePartsQuery({ pageSize: 50 });
  const stockQuery = useStockItemsQuery();
  const [partLines, setPartLines] = useState<
    { partId: string; reserved: number; issued: number; name: string }
  >([]);
  const [actionModal, setActionModal] = useState<
    { type: 'reserve' | 'issue' | 'return' | 'unreserve'; partId: string; quantity: number } | null
  >(null);

  const checklistHistory = workOrder?.checklistHistory ?? [];

  const checklistCompliance = useMemo(() => {
    if (workOrder?.checklistCompliance) return workOrder.checklistCompliance;

    const totalChecks = checklistHistory.length;
    const passedChecks = checklistHistory.filter((entry) => entry.passed).length;
    const passRate = totalChecks ? Number(((passedChecks / totalChecks) * 100).toFixed(1)) : 0;
    const status = totalChecks ? (passRate >= 90 ? 'compliant' : passRate >= 70 ? 'at_risk' : 'failing') : 'unknown';

    return { totalChecks, passedChecks, passRate, status };
  }, [checklistHistory, workOrder?.checklistCompliance]);

  const formatReading = (value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

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

  const availableStock = (partId: string) =>
    (stockQuery.data ?? []).filter((item) => item.partId === partId).reduce((sum, item) => sum + item.quantity, 0);

  const openAction = (type: 'reserve' | 'issue' | 'return' | 'unreserve', partId: string) => {
    setActionModal({ type, partId, quantity: 1 });
  };

  const applyAction = () => {
    if (!actionModal) return;
    const { partId, type, quantity } = actionModal;
    const line = partLines.find((entry) => entry.partId === partId) ?? {
      partId,
      reserved: 0,
      issued: 0,
      name: partsQuery.data?.items.find((p) => p.id === partId)?.name ?? partId,
    };
    const stock = availableStock(partId);
    const updated = { ...line };

    if (quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }

    if (type === 'reserve') {
      const availableForReserve = stock - (line.reserved + line.issued);
      if (quantity > availableForReserve) {
        addToast('Cannot reserve more than available stock', 'error');
        return;
      }
      updated.reserved += quantity;
    }

    if (type === 'issue') {
      const availableToIssue = stock - line.issued;
      if (quantity > availableToIssue) {
        addToast('Cannot issue more than available stock', 'error');
        return;
      }
      updated.issued += quantity;
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    if (type === 'return') {
      updated.issued = Math.max(0, updated.issued - quantity);
    }

    if (type === 'unreserve') {
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    setPartLines((prev) => {
      const without = prev.filter((entry) => entry.partId !== partId);
      return [...without, updated];
    });
    setActionModal(null);
  };

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

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Checklist history</Card.Title>
              <Card.Description>Review per-item readings, evidence, and compliance status.</Card.Description>
            </div>
            <Badge
              text={
                checklistCompliance.status === 'unknown'
                  ? 'No data'
                  : checklistCompliance.status === 'compliant'
                    ? 'Compliant'
                    : checklistCompliance.status === 'at_risk'
                      ? 'At risk'
                      : 'Failing'
              }
              color={
                checklistCompliance.status === 'compliant'
                  ? 'green'
                  : checklistCompliance.status === 'at_risk'
                    ? 'amber'
                    : checklistCompliance.status === 'failing'
                      ? 'red'
                      : undefined
              }
            />
          </div>
        </Card.Header>
        <Card.Content>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Checks logged</p>
              <p className="text-2xl font-semibold text-neutral-100">{checklistCompliance.totalChecks}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Passed</p>
              <p className="text-2xl font-semibold text-neutral-100">{checklistCompliance.passedChecks}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Pass rate</p>
              <p className="text-2xl font-semibold text-neutral-100">{checklistCompliance.passRate}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-500">Last recorded</p>
              <p className="text-2xl font-semibold text-neutral-100">
                {checklistHistory[0]?.recordedAt
                  ? new Date(checklistHistory[0].recordedAt).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800/60 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Item</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Reading</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Evidence</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Recorded at</th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-200">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {checklistHistory.map((entry, index) => (
                  <tr key={`${entry.checklistItemId}-${index}`}>
                    <td className="px-3 py-2 text-neutral-50">{entry.checklistItemLabel ?? entry.checklistItemId}</td>
                    <td className="px-3 py-2 text-neutral-200">{formatReading(entry.reading)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        text={entry.passed === undefined ? 'N/A' : entry.passed ? 'Pass' : 'Fail'}
                        color={entry.passed === undefined ? undefined : entry.passed ? 'green' : 'red'}
                      />
                    </td>
                    <td className="px-3 py-2 text-neutral-200">
                      {entry.evidenceUrls?.length ? (
                        <ul className="space-y-1">
                          {entry.evidenceUrls.map((url) => (
                            <li key={url}>
                              <a className="text-indigo-300 hover:text-indigo-200" href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-200">
                      {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-neutral-200">{entry.recordedBy ?? '—'}</td>
                  </tr>
                ))}
                {!checklistHistory.length && (
                  <tr>
                    <td className="px-3 py-4 text-center text-neutral-500" colSpan={6}>
                      No checklist activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Parts</Card.Title>
              <Card.Description>Reserve, issue, and track quantities against available stock.</Card.Description>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const firstPart = partsQuery.data?.items[0];
                if (firstPart) openAction('reserve', firstPart.id);
              }}
            >
              Add part
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {partsQuery.isLoading && <p className="text-sm text-neutral-500">Loading parts…</p>}
          {partsQuery.error && <p className="text-sm text-rose-500">Unable to load parts.</p>}
          {!partsQuery.isLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-800/50 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Reserved</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Issued</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Available</th>
                    <th className="px-3 py-2 text-left font-medium text-neutral-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {partLines.map((line) => (
                    <tr key={line.partId}>
                      <td className="px-3 py-2 text-neutral-50">{line.name}</td>
                      <td className="px-3 py-2 text-neutral-200">{line.reserved}</td>
                      <td className="px-3 py-2 text-neutral-200">{line.issued}</td>
                      <td className="px-3 py-2 text-neutral-200">{availableStock(line.partId)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="xs" variant="outline" onClick={() => openAction('reserve', line.partId)}>
                            Reserve
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => openAction('issue', line.partId)}>
                            Issue
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => openAction('return', line.partId)}>
                            Return
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => openAction('unreserve', line.partId)}>
                            Unreserve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!partLines.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-neutral-400" colSpan={5}>
                        No parts reserved yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.type ?? ''} part`}
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-800">Part</label>
          <select
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            value={actionModal?.partId ?? ''}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, partId: event.target.value } : prev))
            }
          >
            {partsQuery.data?.items.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            label="Quantity"
            min={1}
            value={actionModal?.quantity ?? 1}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, quantity: Number(event.target.value) } : prev))
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button onClick={applyAction}>Apply</Button>
          </div>
        </div>
      </Modal>

      {id ? (
        <CommentThread entityType="WO" entityId={id} />
      ) : (
        <p className="text-sm text-neutral-500">Work order id required to load comments.</p>
      )}
    </div>
  );
};

export default WorkOrderDetail;

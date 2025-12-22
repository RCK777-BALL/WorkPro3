/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import Input from '@/components/common/Input';
import TextArea from '@/components/common/TextArea';
import { usePurchaseOrder, useUpdatePurchaseOrder, useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useVendors } from '@/hooks/useVendors';
import type { PurchaseOrder, PurchaseOrderInput, PurchaseOrderLineInput } from '@/api/purchasing';
import { formatDate } from '@/utils/date';
import ReceiveModal from './ReceiveModal';

const statuses: PurchaseOrder['status'][] = ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Closed'];

const statusVariant: Record<PurchaseOrder['status'], 'info' | 'success' | 'warning' | 'default'> = {
  Draft: 'default',
  Pending: 'info',
  Approved: 'success',
  Ordered: 'info',
  Received: 'success',
  Closed: 'default',
};

const emptyLine: PurchaseOrderLineInput = { part: '', qtyOrdered: 1, price: 0 };

const PurchaseOrderDetailPage = () => {
  const { poId } = useParams();
  const isNew = !poId || poId === 'new';
  const navigate = useNavigate();
  const { data: vendors } = useVendors();
  const { data: purchaseOrder } = usePurchaseOrder(isNew ? undefined : poId);
  const create = useCreatePurchaseOrder();
  const update = useUpdatePurchaseOrder(poId);
  const [openReceive, setOpenReceive] = useState(false);

  const [form, setForm] = useState<PurchaseOrderInput>({ vendorId: '', lines: [emptyLine] });

  useEffect(() => {
    if (purchaseOrder) {
      setForm({
        vendorId: purchaseOrder.vendorId ?? '',
        poNumber: purchaseOrder.poNumber,
        expectedDate: purchaseOrder.expectedDate,
        notes: purchaseOrder.notes,
        lines: purchaseOrder.lines.map((line) => ({
          part: line.part,
          qtyOrdered: line.qtyOrdered,
          qtyReceived: line.qtyReceived,
          price: line.price,
        })),
      });
    }
  }, [purchaseOrder]);

  const isDraft = purchaseOrder?.status === 'Draft' || isNew;
  const vendorOptions = useMemo(() => vendors ?? [], [vendors]);

  const orderedLines = useMemo(() => purchaseOrder?.lines ?? [], [purchaseOrder]);
  const backordered = useMemo(
    () => orderedLines.filter((line) => (line.qtyReceived ?? 0) < line.qtyOrdered),
    [orderedLines],
  );
  const received = useMemo(
    () => orderedLines.filter((line) => (line.qtyReceived ?? 0) >= line.qtyOrdered),
    [orderedLines],
  );

  const handleLineChange = (index: number, changes: Partial<PurchaseOrderLineInput>) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, idx) => (idx === index ? { ...line, ...changes } : line)),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine, part: '' }] }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isNew) {
      const created = await create.mutateAsync(form);
      navigate(`/purchasing/purchase-orders/${created.id}`);
      return;
    }
    await update.mutateAsync(form);
  };

  const timeline = useMemo(() => {
    const currentStatus = purchaseOrder?.status ?? 'Draft';
    const currentIndex = statuses.indexOf(currentStatus);
    return statuses.map((status, index) => ({
      status,
      done: index <= currentIndex,
    }));
  }, [purchaseOrder?.status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Purchase Order</p>
          <h1 className="text-2xl font-semibold text-neutral-900">{purchaseOrder?.poNumber ?? purchaseOrder?.id ?? 'New PO'}</h1>
          <p className="text-sm text-neutral-500">Create or update purchase orders and receive items.</p>
        </div>
        <div className="flex gap-2">
          {!isNew && <Badge text={purchaseOrder?.status ?? 'Draft'} type={statusVariant[purchaseOrder?.status ?? 'Draft']} />}
          {purchaseOrder && purchaseOrder.status !== 'Closed' && (
            <Button variant="outline" onClick={() => setOpenReceive(true)} disabled={!backordered.length}>
              Receive items
            </Button>
          )}
          <Button as={Link} to="/purchasing/purchase-orders" variant="outline">
            Back to list
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Status timeline" className="lg:col-span-2">
          <div className="flex flex-wrap gap-4">
            {timeline.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${item.done ? 'bg-primary-600' : 'bg-neutral-300'}`}
                  aria-hidden
                />
                <span className="text-sm text-neutral-800">{item.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Audit trail" subtitle="Latest activity" className="space-y-3">
          {purchaseOrder?.activities?.length ? (
            purchaseOrder.activities.map((activity) => (
              <div key={activity.id} className="rounded-md border border-neutral-200 p-3">
                <p className="text-sm text-neutral-800">{activity.message}</p>
                <p className="text-xs text-neutral-500">{formatDate(activity.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">No activity recorded yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Vendor</label>
                <select
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
                  value={form.vendorId}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    setForm((prev) => ({ ...prev, vendorId: event.target.value }))
                  }
                  disabled={!isDraft}
                  required
                >
                  <option value="">Select vendor…</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="PO number"
                value={form.poNumber ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, poNumber: event.target.value }))
                }
                disabled={!isDraft}
              />
              <Input
                label="Expected date"
                type="date"
                value={form.expectedDate ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, expectedDate: event.target.value }))
                }
                disabled={!isDraft}
              />
              <TextArea
                label="Notes"
                value={form.notes ?? ''}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-800">Line items</p>
                {isDraft && (
                  <Button size="sm" variant="outline" onClick={addLine}>
                    Add line
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {form.lines.map((line, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-neutral-200 p-3 md:grid-cols-4">
                    <Input
                      label="Part"
                      value={line.part}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleLineChange(index, { part: event.target.value })
                      }
                      disabled={!isDraft}
                    />
                    <Input
                      label="Quantity ordered"
                      type="number"
                      value={line.qtyOrdered}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleLineChange(index, { qtyOrdered: Number(event.target.value) })
                      }
                      disabled={!isDraft}
                    />
                    <Input
                      label="Unit cost"
                      type="number"
                      value={line.price ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        handleLineChange(index, { price: Number(event.target.value) })
                      }
                      disabled={!isDraft}
                    />
                    <Input
                      label="Received"
                      type="number"
                      value={line.qtyReceived ?? 0}
                      disabled
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" as={Link} to="/purchasing/purchase-orders">
                Cancel
              </Button>
              <Button type="submit" disabled={!isDraft} loading={create.isLoading || update.isLoading}>
                {isNew ? 'Create PO' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
        <Card title="Line status" subtitle="Ordered vs received" className="space-y-3">
          <DataTable
            keyField="part"
            columns={[
              { id: 'part', header: 'Part', accessor: (line) => line.part },
              { id: 'ordered', header: 'Ordered', accessor: (line) => line.qtyOrdered },
              { id: 'received', header: 'Received', accessor: (line) => line.qtyReceived ?? 0 },
            ]}
            data={backordered}
            emptyMessage="No open lines"
          />
          <DataTable
            keyField="part"
            columns={[
              { id: 'part', header: 'Part', accessor: (line) => line.part },
              { id: 'ordered', header: 'Ordered', accessor: (line) => line.qtyOrdered },
              { id: 'received', header: 'Received', accessor: (line) => line.qtyReceived ?? 0 },
            ]}
            data={received}
            emptyMessage="No fully received lines"
          />
        </Card>
      </div>

      <ReceiveModal purchaseOrder={purchaseOrder} open={openReceive} onClose={() => setOpenReceive(false)} />
    </div>
  );
};

export default PurchaseOrderDetailPage;

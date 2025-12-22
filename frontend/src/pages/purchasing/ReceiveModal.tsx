/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import type { PurchaseOrder } from '@/api/purchasing';
import { useAdvancePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useToast } from '@/context/ToastContext';

interface ReceiveModalProps {
  purchaseOrder?: PurchaseOrder;
  open: boolean;
  onClose: () => void;
}

const ReceiveModal = ({ purchaseOrder, open, onClose }: ReceiveModalProps) => {
  const { addToast } = useToast();
  const receiveMutation = useAdvancePurchaseOrder(purchaseOrder?.id);
  const openLines = useMemo(
    () => (purchaseOrder?.lines ?? []).filter((line) => (line.qtyReceived ?? 0) < line.qtyOrdered),
    [purchaseOrder],
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleSubmit = async () => {
    if (!purchaseOrder) return;
    const receipts = openLines
      .map((line) => ({ part: line.part, quantity: quantities[line.part] ?? 0, line }))
      .filter((line) => line.quantity > 0);

    const invalid = receipts.find((receipt) => receipt.quantity + (receipt.line.qtyReceived ?? 0) > receipt.line.qtyOrdered);
    if (invalid) {
      addToast({ title: 'Cannot receive more than ordered', variant: 'error' });
      return;
    }
    await receiveMutation.mutateAsync({
      status: 'Received',
      receipts: receipts.map((receipt) => ({ part: receipt.part, quantity: receipt.quantity })),
    });
    addToast({ title: 'Goods receipt posted', variant: 'success' });
    setQuantities({});
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Receive items">
      <div className="space-y-4">
        <p className="text-sm text-neutral-600">Enter quantities for lines that arrived.</p>
        <div className="space-y-3">
          {openLines.map((line) => {
            const remaining = line.qtyOrdered - (line.qtyReceived ?? 0);
            return (
              <div key={line.part} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{line.part}</p>
                  <p className="text-xs text-neutral-500">Remaining: {remaining}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={remaining}
                  className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                  value={quantities[line.part] ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setQuantities((prev) => ({ ...prev, [line.part]: Number(event.target.value) }))
                  }
                />
              </div>
            );
          })}
          {!openLines.length && <p className="text-sm text-neutral-500">All lines are fully received.</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={receiveMutation.isLoading} disabled={!openLines.length}>
            Receive
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiveModal;

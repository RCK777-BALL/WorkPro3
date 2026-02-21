/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';

type ApprovalAction = 'pending' | 'approved' | 'rejected';

type Props = {
  isOpen: boolean;
  action: ApprovalAction | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    status: ApprovalAction;
    reasonCode?: string;
    signatureName?: string;
    note?: string;
  }) => Promise<void> | void;
};

const reasonCodes = ['operational', 'safety', 'quality', 'compliance', 'budget'] as const;

export default function ESignApprovalModal({ isOpen, action, submitting = false, onClose, onSubmit }: Props) {
  const [reasonCode, setReasonCode] = useState<(typeof reasonCodes)[number]>('operational');
  const [signatureName, setSignatureName] = useState('');
  const [note, setNote] = useState('');

  const requiresSignature = action === 'approved' || action === 'rejected';

  const handleSubmit = async () => {
    if (!action) return;
    await onSubmit({
      status: action,
      reasonCode: requiresSignature ? reasonCode : undefined,
      signatureName: requiresSignature ? signatureName : undefined,
      note: note.trim() || undefined,
    });
    setNote('');
    setSignatureName('');
    setReasonCode('operational');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={action ? `E-sign ${action}` : 'E-sign approval'}
    >
      <div className="space-y-3">
        {requiresSignature ? (
          <>
            <label className="block text-sm font-medium text-[var(--wp-color-text)]">
              Reason code
              <select
                className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm"
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value as (typeof reasonCodes)[number])}
              >
                {reasonCodes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Signer full name"
              value={signatureName}
              onChange={(event) => setSignatureName(event.target.value)}
            />
          </>
        ) : null}
        <Input
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}


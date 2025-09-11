/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  onClose,
  onConfirm,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    open ? ref.current?.showModal() : ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="rounded-xl w-[480px] max-w-[95vw] p-0 backdrop:bg-black/30"
    >
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-2 border hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            className="rounded px-3 py-2 bg-rose-600 text-white hover:bg-rose-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}

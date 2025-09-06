import React, { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm();
    dialogRef.current?.close();
  };

  const handleCancel = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="rounded-md p-6 bg-white text-slate-900 shadow-lg dark:bg-slate-800 dark:text-slate-100"
      onClose={onClose}
    >
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      <p className="mb-6 text-slate-700 dark:text-slate-300">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700"
        >
          {confirmText}
        </button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;


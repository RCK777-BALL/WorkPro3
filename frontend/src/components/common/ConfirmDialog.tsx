import React from 'react';
import Modal from '../modals/Modal';
import Button from './Button';


interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
   confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
 
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
   title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  error,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title}>
      {error && <p className="text-error-600 mb-2">{error}</p>}
      <p>{message}</p>
      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
 
  );
};

export default ConfirmDialog;
 

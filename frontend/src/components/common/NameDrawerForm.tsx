import { useEffect, useState } from 'react';
import Button from './Button';
import Drawer from '../ui/Drawer';

interface Props {
  open: boolean;
  title: string;
  label?: string;
  initialName?: string;
  confirmText?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
}

export default function NameDrawerForm({
  open,
  title,
  label = 'Name',
  initialName = '',
  confirmText = 'Save',
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName);
      setErr('');
      setBusy(false);
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErr('Name is required');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (error: any) {
      setErr(error?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{label}</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-neutral-300 rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          {err && <p className="text-error-600 text-sm mt-1">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {confirmText}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

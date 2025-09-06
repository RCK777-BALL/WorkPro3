import React, { useEffect, useRef, useState } from 'react';
import Button from '../common/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void> | void;
  initial?: { name: string };
}

const DepartmentForm: React.FC<Props> = ({ open, onClose, onSubmit, initial }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim() });
      dialogRef.current?.close();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="rounded-md p-0" onClose={onClose}>
      <form onSubmit={handleSubmit} className="contents">
        <header className="bg-sky-500 text-white px-4 py-2 rounded-t-md">
          <h2 className="text-lg font-semibold">Department</h2>
        </header>
        <div className="p-4 space-y-4">
          {error && <p className="text-error-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
};

export default DepartmentForm;

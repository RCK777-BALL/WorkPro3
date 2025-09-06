import { useState } from 'react';
import Button from '../common/Button';
import { createDepartment, type Department } from '../../api/departments';

interface Props {
  onCreated: (dep: Department) => void;
  onCancel: () => void;
}

export default function AddDepartmentForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dep = await createDepartment({ name: name.trim(), description: description.trim() || undefined });
      onCreated(dep);
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-error-500">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">Name<span className="text-red-500">*</span></label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
}

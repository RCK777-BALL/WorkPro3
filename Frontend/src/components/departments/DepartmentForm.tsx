import React, { useState } from 'react';
import api from '../../utils/api';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import type { Department } from '../../types';

interface Props {
  department?: Department;
  onSuccess?: (dep: Department) => void;
}

const DepartmentForm: React.FC<Props> = ({ department, onSuccess }) => {
  const [name, setName] = useState(department?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let res;
      if (department) {
        res = await api.put(`/departments/${department.id}`, { name });
      } else {
        res = await api.post('/departments', { name });
      }
      const saved = { id: res.data._id ?? res.data.id, name: res.data.name } as Department;
      onSuccess?.(saved);
      addToast(department ? 'Department updated' : 'Department created', 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <Button type="submit" variant="primary" loading={loading}>
        {department ? 'Update Department' : 'Create Department'}
      </Button>
    </form>
  );
};

export default DepartmentForm;

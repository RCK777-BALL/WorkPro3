/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import http from '../../lib/http';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';
import type { PMTask } from '../../types';

interface Props {
  task?: PMTask;
  onSuccess?: (task: PMTask) => void;
}

const PmTaskForm: React.FC<Props> = ({ task, onSuccess }) => {
  const [form, setForm] = useState({
    title: task?.title || '',
    frequency: task?.frequency || 'monthly',
    active: task?.active ?? true,
    nextDue: task?.nextDue ? task.nextDue.split('T')[0] : '',
    notes: task?.notes || '',
    asset: task?.asset || '',
    department: task?.department || ''
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { title, frequency, nextDue, active, notes } = form;
      const payload = {
        title,
        frequency,
        nextDue: nextDue || undefined,
        active,
        notes: notes || undefined,
      };
      let res;
      if (task) {
        res = await http.put(`/pm-tasks/${task.id}`, payload);
      } else {
        res = await http.post('/pm-tasks', payload);
      }
      const saved = { ...(res.data as any), id: res.data._id ?? res.data.id } as PMTask;
      onSuccess?.(saved);
      addToast(task ? 'PM Task updated' : 'PM Task created', 'success');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log in.');
      } else if (Array.isArray(err.response?.data?.errors)) {
        setError(err.response.data.errors.map((e: any) => e.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Failed to submit task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-error-500">{error}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Frequency</label>
        <select
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={form.frequency}
          onChange={e => update('frequency', e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annually">Annually</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Next Due</label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          value={form.nextDue}
          onChange={e => update('nextDue', e.target.value)}
        />
      </div>
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => update('active', e.target.checked)}
          />
          <span>Active</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          className="w-full px-3 py-2 border border-neutral-300 rounded-md"
          rows={3}
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
        />
      </div>
      <Button type="submit" variant="primary" loading={loading}>
        {task ? 'Update Task' : 'Create Task'}
      </Button>
    </form>
  );
};

export default PmTaskForm;

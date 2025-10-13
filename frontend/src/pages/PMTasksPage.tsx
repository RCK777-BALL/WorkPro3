/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import PmTaskForm from '@/components/maintenance/PmTaskForm';
import http from '@/lib/http';
import type { PMTask } from '@/types';

const PMTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PMTask | null>(null);

  const loadTasks = async () => {
    try {
      interface PMTaskResponse extends Partial<PMTask> { _id?: string; id?: string }
      const res = await http.get<PMTaskResponse[]>('/pm-tasks', { withCredentials: true });
      const data: PMTask[] = Array.isArray(res.data)
        ? res.data.flatMap((task) => {
            const resolvedId = task._id ?? task.id;
            if (!resolvedId) {
              return [];
            }
            const normalized: PMTask = {
              id: resolvedId,
              title: task.title ?? 'Untitled Task',
              frequency: task.frequency ?? 'monthly',
              active: task.active ?? true,
            };
            if (task.lastRun !== undefined) normalized.lastRun = task.lastRun;
            if (task.nextDue !== undefined) normalized.nextDue = task.nextDue;
            if (task.notes !== undefined) normalized.notes = task.notes;
            if (task.asset !== undefined) normalized.asset = task.asset;
            if (task.department !== undefined) normalized.department = task.department;
            return [normalized];
          })
        : [];
      setTasks(data);
    } catch (err) {
      console.error(err);
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 401) {
        setError('Unauthorized. Please log in.');
      } else {
        setError('Failed to load tasks');
      }
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSuccess = async () => {
    await loadTasks();
    setShowForm(false);
    setSelected(null);
  };

  return (
          <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">PM Tasks</h1>
          <Button variant="primary" onClick={() => { setSelected(null); setShowForm(true); }}>
            New Task
          </Button>
        </div>
        {error && <p className="text-error-500">{error}</p>}
        <ul className="divide-y divide-neutral-200">
          {tasks.map(t => (
            <li key={t.id} className="py-2 flex justify-between items-center">
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-neutral-500">{t.frequency}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setSelected(t); setShowForm(true); }}>
                Edit
              </Button>
            </li>
          ))}
          {tasks.length === 0 && <li className="py-2 text-neutral-500">No tasks</li>}
        </ul>
        {showForm && (
          <div className="bg-white p-4 rounded shadow">
            <PmTaskForm
              {...(selected ? { task: selected } : {})}
              onSuccess={() => { void handleSuccess(); }}
            />
          </div>
        )}
      </div>
  );
};

export default PMTasksPage;

import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import PmTaskForm from '../components/maintenance/PmTaskForm';
import api from '../lib/api';
import type { PMTask } from '../types';

const PMTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<PMTask | null>(null);

  const loadTasks = async () => {
    try {
      const res = await api.get('/pm-tasks', { withCredentials: true });
      setTasks((res.data as any[]).map(t => ({ ...t, id: t._id ?? t.id })) as PMTask[]);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log in.');
      } else {
        setError('Failed to load tasks');
      }
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleSuccess = async () => {
    await loadTasks();
    setShowForm(false);
    setSelected(null);
  };

  return (
    <Layout title="PM Tasks">
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
            <PmTaskForm task={selected || undefined} onSuccess={handleSuccess} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PMTasksPage;

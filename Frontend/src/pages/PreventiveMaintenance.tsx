import React, { useEffect, useState } from 'react';
import PMModal from '../components/modals/PMModal';
import { fetchPmTasks, createPmTask } from '../api/endpoints/pm';

const PreventiveMaintenance: React.FC = () => {
  const [tasks, setTasks] = useState<Record<string, unknown>[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPmTasks().then((response) => setTasks(response.items));
  }, []);

  const handleSave = async (payload: { title: string; cadenceDays: number; assetId: string }) => {
    await createPmTask({
      title: payload.title,
      schedule: { cadenceType: 'time', cadenceValue: payload.cadenceDays },
      assetIds: [payload.assetId],
    });
    const response = await fetchPmTasks();
    setTasks(response.items);
    setIsOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Preventive Maintenance</h1>
          <p className="text-sm text-neutral-500">Manage PM schedules and next run dates.</p>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white" onClick={() => setIsOpen(true)}>
          Add PM task
        </button>
      </header>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={String(task._id ?? task.id)} className="border-b border-neutral-100">
                <td className="px-4 py-2 text-neutral-900">{String(task.title ?? 'PM Task')}</td>
                <td className="px-4 py-2 text-neutral-600">{String(task.active ?? true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PMModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={handleSave} />
    </div>
  );
};

export default PreventiveMaintenance;

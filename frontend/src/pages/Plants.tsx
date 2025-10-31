/*
 * SPDX-License-Identifier: MIT
 */

import { FormEvent, useEffect, useState } from 'react';
import http from '@/lib/http';

interface Plant {
  _id: string;
  name: string;
  location?: string;
  description?: string;
}

export default function Plants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPlants = async () => {
    try {
      const response = await http.get<Plant[]>('/plants');
      setPlants(response.data ?? []);
    } catch (err) {
      console.error('Failed to load plants', err);
    }
  };

  useEffect(() => {
    void loadPlants();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await http.post('/plants', {
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      setName('');
      setLocation('');
      setDescription('');
      await loadPlants();
    } catch (err) {
      console.error('Failed to create plant', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Plants</h1>
        <p className="text-sm text-slate-400">
          Manage each plant in your organization and define their locations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-slate-100"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Add Plant
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Location</label>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Description</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add Plant'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Existing Plants</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Location</th>
                <th className="px-3 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {plants.map((plant) => (
                <tr key={plant._id}>
                  <td className="px-3 py-2">{plant.name}</td>
                  <td className="px-3 py-2 text-slate-400">{plant.location || '—'}</td>
                  <td className="px-3 py-2 text-slate-400">{plant.description || '—'}</td>
                </tr>
              ))}
              {plants.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={3}>
                    No plants yet. Add your first plant above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

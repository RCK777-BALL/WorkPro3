/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import type { Timesheet } from '@/types';
import { useToast } from '@/context/ToastContext';

const TimeSheets: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [form, setForm] = useState({ date: '', hours: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addToast } = useToast();

  const loadTimesheets = async () => {
    try {
      const res = await http.get<Timesheet[]>('/timesheets');
      const data: Timesheet[] = Array.isArray(res.data)
        ? res.data.map((t) => ({
            id: t._id ?? t.id,
            date: t.date,
            hours: t.hours,
            description: t.description,
          }))
        : [];
      setTimesheets(data);
    } catch {
      addToast('Failed to load timesheets', 'error');
    }
  };

  useEffect(() => {
    loadTimesheets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      date: form.date,
      hours: Number(form.hours),
      description: form.description,
    };
    if (!Number.isFinite(payload.hours) || payload.hours < 0) {
      addToast('Hours must be a non-negative number', 'error');
      return;
    }
    try {
      if (editingId) {
        await http.put(`/timesheets/${editingId}`, payload);
        setTimesheets((prev) =>
          prev.map((t) => (t.id === editingId ? { id: editingId, ...payload } : t)),
        );
      } else {
        const res = await http.post('/timesheets', payload);
        setTimesheets((prev) => [
          ...prev,
          { id: res.data._id ?? res.data.id, ...payload },
        ]);
      }
      setForm({ date: '', hours: '', description: '' });
      setEditingId(null);
    } catch {
      addToast('Failed to save timesheet', 'error');
    }
  };

  const handleEdit = (ts: Timesheet) => {
    setForm({
      date: ts.date,
      hours: ts.hours.toString(),
      description: ts.description || '',
    });
    setEditingId(ts.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/timesheets/${id}`);
      setTimesheets((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm({ date: '', hours: '', description: '' });
      }
    } catch {
      addToast('Failed to delete timesheet', 'error');
    }
  };

  return (
          <div className="max-w-2xl mx-auto space-y-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow space-y-4"
        >
          <h2 className="text-xl font-bold">
            {editingId ? 'Edit Timesheet' : 'New Timesheet'}
          </h2>
          <input
            type="date"
            value={form.date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, date: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            value={form.hours}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, hours: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Hours"
            required
          />
          <input
            type="text"
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
            className="w-full p-2 border rounded"
            placeholder="Description"
          />
          <div className="flex space-x-2">
            <Button type="submit" variant="primary">
              {editingId ? 'Update' : 'Submit'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm({ date: '', hours: '', description: '' });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="space-y-4">
          {timesheets.map((ts) => (
            <div
              key={ts.id}
              className="flex justify-between items-center p-4 bg-white dark:bg-neutral-800 rounded-lg shadow"
            >
              <div>
                <p className="font-medium">
                  {ts.date} - {ts.hours}h
                </p>
                {ts.description && (
                  <p className="text-sm text-neutral-500">{ts.description}</p>
                )}
              </div>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(ts)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(ts.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
  );
};

export default TimeSheets;

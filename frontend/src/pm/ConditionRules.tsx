/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import Button from '../components/common/Button';
import http from '../lib/http';
import { useToast } from '../context/ToastContext';


interface ConditionRule {
  _id?: string;
  asset: string;
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' ;
  threshold: number;
  workOrderTitle: string;
  workOrderDescription?: string;
  active: boolean;
}

const emptyRule: ConditionRule = {
  asset: '',
  metric: '',
  operator: '>',
  threshold: 0,
  workOrderTitle: '',
  workOrderDescription: '',
  active: true,
};

const ConditionRules: React.FC = () => {
  const [rules, setRules] = useState<ConditionRule[]>([]);
  const [form, setForm] = useState<ConditionRule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const loadRules = async () => {
    try {
      const res = await http.get('/condition-rules', { withCredentials: true });
      setRules(res.data as ConditionRule[]);
    } catch {
      setError('Failed to load rules');
      addToast('Failed to load rules', 'error');
    }
  };

  useEffect(() => { loadRules(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      if (form._id) {
        await http.put(`/condition-rules/${form._id}`, form, { withCredentials: true });
      } else {
        await http.post('/condition-rules', form, { withCredentials: true });
      }
      setForm(null);
      await loadRules();
    } catch {
      addToast('Failed to save rule', 'error');
    }
  };

  return (
          <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Condition Rules</h1>
          <Button variant="primary" onClick={() => setForm({ ...emptyRule })}>
            New Rule
          </Button>
        </div>
        {error && <p className="text-error-500">{error}</p>}
        <ul className="divide-y divide-neutral-200">
          {rules.map(r => (
            <li key={r._id} className="py-2 flex justify-between items-center">
              <div>
                <p className="font-medium">{r.metric} {r.operator} {r.threshold}</p>
                <p className="text-sm text-neutral-500">{r.workOrderTitle}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setForm(r)}>
                Edit
              </Button>
            </li>
          ))}
          {rules.length === 0 && <li className="py-2 text-neutral-500">No rules</li>}
        </ul>
        {form && (
          <div className="bg-white p-4 rounded shadow">
            <form className="space-y-2" onSubmit={handleSubmit}>
              <input
                className="border p-1 w-full"
                placeholder="Asset ID"
                value={form.asset}
                onChange={e => setForm({ ...form, asset: e.target.value })}
              />
              <input
                className="border p-1 w-full"
                placeholder="Metric"
                value={form.metric}
                onChange={e => setForm({ ...form, metric: e.target.value })}
              />
              <select
                className="border p-1 w-full"
                value={form.operator}
                onChange={e => setForm({ ...form, operator: e.target.value as ConditionRule['operator'] })}
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="==">==</option>
              </select>
              <input
                className="border p-1 w-full"
                type="number"
                placeholder="Threshold"
                value={form.threshold}
                onChange={e => setForm({ ...form, threshold: Number(e.target.value) })}
              />
              <input
                className="border p-1 w-full"
                placeholder="Work Order Title"
                value={form.workOrderTitle}
                onChange={e => setForm({ ...form, workOrderTitle: e.target.value })}
              />
              <input
                className="border p-1 w-full"
                placeholder="Work Order Description"
                value={form.workOrderDescription}
                onChange={e => setForm({ ...form, workOrderDescription: e.target.value })}
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                />
                <span>Active</span>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" variant="primary">Save</Button>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}
      </div>
  );
};

export default ConditionRules;


/* eslint-disable react-hooks/exhaustive-deps */
/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';
import Button from '../components/common/Button';
import http from '../lib/http';
import { useToast } from '../context/ToastContext';
 

interface Tenant {
  id: string;
  name: string;
}

const tenantResponseSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    name: z.string(),
  })
  .refine((tenant) => tenant._id || tenant.id, { message: 'Missing tenant id' });

type TenantResponse = z.infer<typeof tenantResponseSchema>;

const AdminTenants = () => {
  const { addToast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await http.get<TenantResponse[]>('/tenants');
      const data = z.array(tenantResponseSchema).parse(res.data);
      setTenants(data.map((t) => ({ id: t._id ?? t.id!, name: t.name })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load tenants', 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await http.put(`/tenants/${editing}`, { name });
        const tenant = tenantResponseSchema.parse(res.data);
        setTenants((ts: Tenant[]) =>
          ts.map((t: Tenant) =>
            t.id === editing ? { id: tenant._id ?? tenant.id!, name: tenant.name } : t,
          ),
        );
        addToast('Tenant updated', 'success');
      } else {
        const res = await http.post('/tenants', { name });
        const tenant = tenantResponseSchema.parse(res.data);
        setTenants((ts: Tenant[]) => [...ts, { id: tenant._id ?? tenant.id!, name: tenant.name }]);
        addToast('Tenant created', 'success');
      }
      setName('');
      setEditing(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to save tenant', 'error');
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditing(tenant.id);
    setName(tenant.name);
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/tenants/${id}`);
      setTenants((ts: Tenant[]) => ts.filter((t: Tenant) => t.id !== id));
      addToast('Tenant deleted', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to delete tenant', 'error');
    }
  };

  return (
          <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Tenants</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            className="flex-1 border rounded px-2 py-1"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Tenant name"
          />
          <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
          {editing && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setName('');
              }}
            >
              Cancel
            </Button>
          )}
        </form>
        <ul className="space-y-2">
          {tenants.map((t) => (
            <li key={t.id} className="flex justify-between items-center border px-2 py-1 rounded">
              <span>{t.name}</span>
              <div className="space-x-2">
                <Button size="sm" onClick={() => handleEdit(t)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
  );
};

export default AdminTenants;



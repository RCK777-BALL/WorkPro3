import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import DepartmentForm from '../components/departments/DepartmentForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import type { Department } from '../types';
import Modal from '../components/modals/Modal';

interface Dept extends Department {
  lines?: Array<{ id: string; name: string }>;
}

export default function Departments() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Dept | null>(null);
  // Confirm dialog no longer displays inline errors or loading state

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/departments');
      const data = (res.data as any[]).map((d) => ({
        id: d._id ?? d.id,
        name: d.name,
        lines: d.lines,
      }));
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = (dep: Department) => {
    setItems((prev) => {
      const idx = prev.findIndex((d) => d.id === dep.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...dep };
        return copy;
      }
      return [...prev, { ...dep, lines: [] }];
    });
    setModalOpen(false);
    setEditing(null);
  };

  const openDelete = (dep: Dept) => {
    setPendingDelete(dep);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.delete(`/departments/${pendingDelete.id}`);
      setItems((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      addToast('Department deleted', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(
        err.response?.data?.message || 'Failed to delete department',
        'error'
      );
    } finally {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const filtered = q
    ? items.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    : items;

  const columns = [
    { header: 'Name', accessor: 'name' as const },
    { header: 'Lines', accessor: (d: Dept) => d.lines?.length ?? 0 },
    {
      header: 'Actions',
      accessor: (d: Dept) => (
        <div className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(d);
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => openDelete(d)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Departments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search departments..."
            className="border rounded px-2 py-1"
          />
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Department
          </Button>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <DataTable
            columns={columns}
            data={filtered}
            keyField="id"
            isLoading={loading}
            emptyMessage={error ?? 'No departments'}
          />
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete Department"
          message={`Are you sure you want to delete "${pendingDelete?.name}"?`}
          onConfirm={handleDelete}
          onClose={() => setConfirmOpen(false)}
          confirmText="Delete"
        />
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          title={editing ? 'Edit Department' : 'Add Department'}
        >
          <DepartmentForm
            department={editing ? { id: editing.id, name: editing.name } : undefined}
            onSuccess={handleSave}
          />
        </Modal>
      </div>
    </Layout>
  );
}

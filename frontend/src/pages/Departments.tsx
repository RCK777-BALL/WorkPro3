import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Drawer from '../components/ui/Drawer';
import { DepartmentForm, type DepartmentPayload } from '../components/departments/forms';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from '../api/departments';

type DrawerState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; dep: Department };

export default function Departments() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'none' });

  useEffect(() => {
    listDepartments()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDepartment(id);
    setItems((prev) => prev.filter((d) => d._id !== id));
  };

  return (
    <Layout title="Departments">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Departments</h1>
          <Button onClick={() => setDrawer({ kind: 'create' })}>Add Department</Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {items.map((d) => (
              <li key={d._id} className="py-2 flex items-center justify-between">
                <span>{d.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrawer({ kind: 'edit', dep: d })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(d._id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Drawer
          open={drawer.kind !== 'none'}
          onClose={() => setDrawer({ kind: 'none' })}
          title={drawer.kind === 'edit' ? 'Edit Department' : 'Add Department'}
        >
          <DepartmentForm
            initial={
              drawer.kind === 'edit'
                ? { name: drawer.dep.name, description: drawer.dep.description }
                : undefined
            }
            onCancel={() => setDrawer({ kind: 'none' })}
            onSubmit={async (payload: DepartmentPayload) => {
              if (drawer.kind === 'edit') {
                const updated = await updateDepartment(drawer.dep._id, payload);
                setItems((prev) =>
                  prev.map((d) => (d._id === updated._id ? updated : d)),
                );
              } else {
                const created = await createDepartment(payload);
                setItems((prev) => [created, ...prev]);
              }
              setDrawer({ kind: 'none' });
            }}
          />
        </Drawer>
      </div>
    </Layout>
  );
}


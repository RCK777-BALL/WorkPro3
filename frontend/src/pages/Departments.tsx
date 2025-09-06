import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Drawer from '../components/ui/Drawer';
import { DepartmentForm, type DepartmentPayload } from '../components/departments/forms';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  type Department,
} from '../api/departments';

export default function Departments() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  useEffect(() => {
    setLoading(true);
    listDepartments()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Departments">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Departments</h1>
          <Button
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            Add Department
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {items.map((d) => (
              <li key={d._id} className="py-2 flex items-center justify-between">
                {d.name}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(d);
                    setOpenForm(true);
                  }}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Drawer
          open={openForm}
          onClose={() => setOpenForm(false)}
          title={editing ? 'Edit Department' : 'Add Department'}
        >
          <DepartmentForm
            initial={editing ? { name: editing.name, description: editing.description } : undefined}
            onCancel={() => {
              setOpenForm(false);
              setEditing(null);
            }}
            onSubmit={async (payload: DepartmentPayload) => {
              if (editing) {
                const updated = await updateDepartment(editing._id, payload);
                setItems((prev) =>
                  prev.map((d) => (d._id === updated._id ? updated : d))
                );
              } else {
                const dep = await createDepartment(payload);
                setItems((prev) => [dep, ...prev]);
              }
              setOpenForm(false);
              setEditing(null);
            }}
          />
        </Drawer>
      </div>
    </Layout>
  );
}

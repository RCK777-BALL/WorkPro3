import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Drawer from '../components/ui/Drawer';
import AddDepartmentForm from '../components/departments/AddDepartmentForm';
import { listDepartments, type Department } from '../api/departments';

export default function Departments() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

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
          <Button onClick={() => setOpenCreate(true)}>Add Department</Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {items.map((d) => (
              <li key={d._id} className="py-2">
                {d.name}
              </li>
            ))}
          </ul>
        )}

        <Drawer open={openCreate} onClose={() => setOpenCreate(false)} title="Add Department">
          <AddDepartmentForm
            onCreated={(dep) => {
              setItems((prev) => [dep, ...prev]);
              setOpenCreate(false);
            }}
            onCancel={() => setOpenCreate(false)}
          />
        </Drawer>
      </div>
    </Layout>
  );
}

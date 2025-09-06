import { Fragment, useEffect, useState } from 'react';
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
  const [items, setItems] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(false);
   const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
 

  useEffect(() => {
    setLoading(true);
    listDepartments()
      .then((deps) => deps.map((d) => ({ ...d, lines: [] })))
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const toggleDep = (id: string) =>
    setExpandedDeps((s) => ({ ...s, [id]: !s[id] }));

  const toggleLine = (depId: string, lineId: string) =>
    setExpandedLines((s) => ({
      ...s,
      [depId]: { ...s[depId], [lineId]: !s[depId]?.[lineId] },
    }));

  const assetCount = (dep: DeptItem) =>
    dep.lines.reduce(
      (sum, l) => sum + l.stations.reduce((s, st) => s + st.assets, 0),
      0
    );

  const handleFormSubmit = (values: { name: string; assets?: number }) => {
    if (!form) return;
    switch (form.type) {
      case 'editDepartment':
        setItems((prev) =>
          prev.map((d) => (d._id === form.depId ? { ...d, name: values.name } : d))
        );
        break;
      case 'createLine':
        setItems((prev) =>
          prev.map((d) =>
            d._id === form.depId
              ? {
                  ...d,
                  lines: [
                    { id: Date.now().toString(), name: values.name, stations: [] },
                    ...d.lines,
                  ],
                }
              : d
          )
        );
        break;
      case 'editLine':
        setItems((prev) =>
          prev.map((d) =>
            d._id === form.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === form.line.id ? { ...l, name: values.name } : l
                  ),
                }
              : d
          )
        );
        break;
      case 'createStation':
        setItems((prev) =>
          prev.map((d) =>
            d._id === form.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === form.lineId
                      ? {
                          ...l,
                          stations: [
                            {
                              id: Date.now().toString(),
                              name: values.name,
                              assets: values.assets ?? 0,
                            },
                            ...l.stations,
                          ],
                        }
                      : l
                  ),
                }
              : d
          )
        );
        break;
      case 'editStation':
        setItems((prev) =>
          prev.map((d) =>
            d._id === form.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === form.lineId
                      ? {
                          ...l,
                          stations: l.stations.map((s) =>
                            s.id === form.station.id
                              ? { ...s, name: values.name, assets: values.assets ?? s.assets }
                              : s
                          ),
                        }
                      : l
                  ),
                }
              : d
          )
        );
        break;
    }
    setForm(null);
  };

  const confirmDelete = (msg: string) => window.confirm(msg);

  const removeDepartment = (id: string) => {
    if (!confirmDelete('Delete department?')) return;
    setItems((prev) => prev.filter((d) => d._id !== id));
    apiDeleteDepartment(id).catch(() => {
      // rollback could be added here
    });
  };

  const removeLine = (depId: string, lineId: string) => {
    if (!confirmDelete('Delete line?')) return;
    setItems((prev) =>
      prev.map((d) =>
        d._id === depId
          ? { ...d, lines: d.lines.filter((l) => l.id !== lineId) }
          : d
      )
    );
  };

  const removeStation = (depId: string, lineId: string, stationId: string) => {
    if (!confirmDelete('Delete station?')) return;
    setItems((prev) =>
      prev.map((d) =>
        d._id === depId
          ? {
              ...d,
              lines: d.lines.map((l) =>
                l.id === lineId
                  ? {
                      ...l,
                      stations: l.stations.filter((s) => s.id !== stationId),
                    }
                  : l
              ),
            }
          : d
      )
    );
  };

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

        <NameDrawerForm
          open={form !== null}
          title={
            form?.type === 'editDepartment'
              ? 'Edit Department'
              : form?.type === 'createLine'
              ? 'Add Line'
              : form?.type === 'editLine'
              ? 'Edit Line'
              : form?.type === 'createStation'
              ? 'Add Station'
              : form?.type === 'editStation'
              ? 'Edit Station'
              : ''
          }
          initialName={
            form?.type === 'editDepartment'
              ? form.name
              : form?.type === 'editLine'
              ? form.line.name
              : form?.type === 'editStation'
              ? form.station.name
              : ''
          }
          initialAssets={
            form?.type === 'editStation' ? form.station.assets : 0
          }
          showAssetInput={
            form?.type === 'createStation' || form?.type === 'editStation'
          }
          onSubmit={handleFormSubmit}
          onCancel={() => setForm(null)}
        />
      </div>
    </Layout>
  );
}

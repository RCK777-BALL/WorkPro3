import { Fragment, useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Drawer from '../components/ui/Drawer';
import AddDepartmentForm from '../components/departments/AddDepartmentForm';
import NameDrawerForm from '../components/common/NameDrawerForm';
import {
  listDepartments,
  deleteDepartment as apiDeleteDepartment,
  type Department,
} from '../api/departments';

interface Station {
  id: string;
  name: string;
  assets: number;
}

interface Line {
  id: string;
  name: string;
  stations: Station[];
}

interface DeptItem extends Department {
  lines: Line[];
}

type FormState =
  | { type: 'editDepartment'; depId: string; name: string }
  | { type: 'createLine'; depId: string }
  | { type: 'editLine'; depId: string; line: Line }
  | { type: 'createStation'; depId: string; lineId: string }
  | { type: 'editStation'; depId: string; lineId: string; station: Station };

export default function Departments() {
  const [items, setItems] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [expandedDeps, setExpandedDeps] = useState<Record<string, boolean>>({});
  const [expandedLines, setExpandedLines] =
    useState<Record<string, Record<string, boolean>>>({});

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
          <Button onClick={() => setOpenCreate(true)}>Add Department</Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full border">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-2 py-1">Name</th>
                <th className="px-2 py-1">Lines</th>
                <th className="px-2 py-1">Assets</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <Fragment key={d._id}>
                  <tr className="border-t">
                    <td className="px-2 py-1">
                      <button
                        className="font-medium"
                        onClick={() => toggleDep(d._id)}
                      >
                        {expandedDeps[d._id] ? '−' : '+'} {d.name}
                      </button>
                    </td>
                    <td className="text-center px-2 py-1">{d.lines.length}</td>
                    <td className="text-center px-2 py-1">{assetCount(d)}</td>
                    <td className="text-right space-x-2 px-2 py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm({
                          type: 'editDepartment',
                          depId: d._id,
                          name: d.name,
                        })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeDepartment(d._id)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm({ type: 'createLine', depId: d._id })}
                      >
                        Add Line
                      </Button>
                    </td>
                  </tr>
                  {expandedDeps[d._id] &&
                    d.lines.map((l) => (
                      <Fragment key={l.id}>
                        <tr className="border-t">
                          <td className="px-2 py-1 pl-6">
                            <button
                              onClick={() => toggleLine(d._id, l.id)}
                              className="font-medium"
                            >
                              {expandedLines[d._id]?.[l.id] ? '−' : '+'} {l.name}
                            </button>
                          </td>
                          <td className="text-center px-2 py-1">
                            {l.stations.length}
                          </td>
                          <td className="text-center px-2 py-1">
                            {l.stations.reduce((s, st) => s + st.assets, 0)}
                          </td>
                          <td className="text-right space-x-2 px-2 py-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setForm({ type: 'editLine', depId: d._id, line: l })
                              }
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => removeLine(d._id, l.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setForm({
                                  type: 'createStation',
                                  depId: d._id,
                                  lineId: l.id,
                                })
                              }
                            >
                              Add Station
                            </Button>
                          </td>
                        </tr>
                        {expandedLines[d._id]?.[l.id] &&
                          l.stations.map((s) => (
                            <tr key={s.id} className="border-t">
                              <td className="px-2 py-1 pl-12">{s.name}</td>
                              <td className="text-center px-2 py-1">-</td>
                              <td className="text-center px-2 py-1">{s.assets}</td>
                              <td className="text-right space-x-2 px-2 py-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setForm({
                                      type: 'editStation',
                                      depId: d._id,
                                      lineId: l.id,
                                      station: s,
                                    })
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => removeStation(d._id, l.id, s.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        <Drawer open={openCreate} onClose={() => setOpenCreate(false)} title="Add Department">
          <AddDepartmentForm
            onCreated={(dep) => {
              setItems((prev) => [{ ...dep, lines: [] }, ...prev]);
              setOpenCreate(false);
            }}
            onCancel={() => setOpenCreate(false)}
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
